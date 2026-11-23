// Chargement et enregistrement des données d'un établissement dans Supabase.
// Seules les différences sont envoyées ; la sécurité (RLS) garantit qu'on ne
// touche qu'à son propre établissement.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppState } from "../types";
import { CHILD_TABLES, diffRows, fromRows, readsFromRows, requestsFromRows, rowKey, toRows, type ChildTable, type Rows } from "./mapping";

type Row = Record<string, unknown>;

/** Lit toutes les lignes d'une table (par paquets de 1000, limite de Supabase). */
async function fetchAll(sb: SupabaseClient, table: string, est: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select("*").eq("establishment_id", est).range(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

/** Tous les établissements dont l'utilisateur connecté est membre. */
export async function listEstablishments(sb: SupabaseClient): Promise<{ id: string; name: string; type: AppState["establishment"]["type"]; role: "owner" | "manager" }[]> {
  const { data, error } = await sb.from("members").select("role, establishments ( id, name, activity, created_at )");
  if (error) throw error;
  type Row = { role: "owner" | "manager"; establishments: { id: string; name: string; activity: string; created_at: string } | null };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.establishments)
    .sort((a, b) => a.establishments!.created_at.localeCompare(b.establishments!.created_at))
    .map((r) => ({ id: r.establishments!.id, name: r.establishments!.name, type: r.establishments!.activity as AppState["establishment"]["type"], role: r.role }));
}

export async function loadEstablishment(sb: SupabaseClient, est: string, currentWeek?: string): Promise<{ state: AppState; rows: Rows }> {
  const [{ data: e, error: e1 }, { data: r }] = await Promise.all([
    sb.from("establishments").select("*").eq("id", est).single(),
    sb.from("rules").select("*").eq("establishment_id", est).maybeSingle(),
  ]);
  if (e1) throw e1;
  const lists = await Promise.all(CHILD_TABLES.map((t) => fetchAll(sb, t, est)));
  const raw = Object.fromEntries(CHILD_TABLES.map((t, i) => [t, lists[i]])) as Record<ChildTable, Row[]>;
  const rows: Rows = { establishment: e as Row, rules: (r as Row) ?? { establishment_id: est }, ...raw };
  const state = { ...fromRows(rows, { currentWeek, shareToken: await shareTokenOf(sb, est) }), reads: await loadReads(sb, est) };
  // On garde la version « normalisée » pour comparer ensuite sans faux écarts
  return { state, rows: toRows(state, est) };
}

/** Jeton du lien de partage de l'équipe (créé au premier besoin). */
export async function shareTokenOf(sb: SupabaseClient, est: string): Promise<string> {
  const { data } = await sb.from("share_links").select("token").eq("establishment_id", est).is("revoked_at", null).order("created_at").limit(1);
  if (data?.[0]?.token) return String(data[0].token);
  const { data: created } = await sb.from("share_links").insert({ establishment_id: est }).select("token").single();
  return created?.token ? String(created.token) : "";
}

export async function loadReads(sb: SupabaseClient, est: string) {
  const { data, error } = await sb.from("week_reads").select("*").eq("establishment_id", est);
  if (error) return {};
  return readsFromRows(data ?? []);
}

/** Relit ce que l'équipe a pu changer (demandes, accusés de lecture) sans toucher au reste. */
export async function loadTeamActivity(sb: SupabaseClient, est: string) {
  const [req, reads] = await Promise.all([fetchAll(sb, "requests", est), loadReads(sb, est)]);
  return { requests: requestsFromRows(req), reads, requestRows: req };
}

/** Enregistre les différences entre `prev` et l'état actuel. Renvoie les nouvelles lignes de référence. */
export async function pushChanges(sb: SupabaseClient, est: string, prev: Rows | null, state: AppState): Promise<Rows> {
  const next = toRows(state, est);
  const d = diffRows(prev, next);
  const check = (res: { error: unknown }) => {
    if (res.error) throw res.error;
  };

  if (d.establishment) {
    const { id: _id, ...fields } = next.establishment; // eslint-disable-line @typescript-eslint/no-unused-vars
    check(await sb.from("establishments").update(fields).eq("id", est));
  }
  if (d.rules) check(await sb.from("rules").upsert(next.rules));

  // 1. Suppressions : enfants d'abord, parents ensuite
  for (const t of [...d.tables].reverse()) {
    if (!t.deletes.length) continue;
    if (t.table === "needs") {
      for (const r of t.deletes) check(await sb.from("needs").delete().match({ establishment_id: est, day: r.day, service_id: r.service_id, post_id: r.post_id }));
    } else if (t.table === "weeks") {
      check(await sb.from("weeks").delete().eq("establishment_id", est).in("week", t.deletes.map((r) => rowKey("weeks", r))));
    } else if (t.table === "requests") {
      continue; // les demandes de l'équipe ne sont jamais effacées par le gérant (seulement refusées)
    } else {
      const ids = t.deletes.map((r) => rowKey(t.table, r));
      for (let i = 0; i < ids.length; i += 200) check(await sb.from(t.table).delete().eq("establishment_id", est).in("id", ids.slice(i, i + 200)));
    }
  }
  // 2. Écritures : parents d'abord (postes, créneaux types, employés), enfants ensuite
  for (const t of d.tables) {
    for (let i = 0; i < t.upserts.length; i += 500) check(await sb.from(t.table).upsert(t.upserts.slice(i, i + 500)));
  }
  return next;
}

/** Crée l'établissement de l'utilisateur connecté et y enregistre tout l'état. */
export async function createEstablishmentFrom(sb: SupabaseClient, state: AppState): Promise<{ est: string; rows: Rows }> {
  const { data, error } = await sb.rpc("create_establishment", { p_name: state.establishment.name, p_activity: state.establishment.type });
  if (error) throw error;
  const est = data as string;
  const rows = await pushChanges(sb, est, null, state);
  return { est, rows };
}
