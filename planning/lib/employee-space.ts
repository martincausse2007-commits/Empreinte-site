// L'espace d'un salarié : ce qu'il voit et ce qu'il peut demander.
// Même écran pour la démo (données du navigateur) et pour un vrai compte (base).

import type { AbsenceType, AppState, EmployeePrefs, OpenShift, Post, Shift, TeamRequest, Unavailability } from "./types";
import { answerPeer, cancelRequest, claimProblems, markRead, newRequest, swapProblems } from "./requests";
import type { Issue } from "./engine/check";
import { getSupabase } from "./supabase/client";

export type SpaceWeek = { publishedAt?: string; snapshot: Shift[]; openShifts: OpenShift[] };
export type Space = {
  id: string; // établissement
  name: string;
  me: { id: string; firstName: string; lastName: string; postIds: string[]; contractHours: number; unavailability: Unavailability[]; prefs?: EmployeePrefs };
  colleagues: { id: string; firstName: string; postIds: string[] }[];
  posts: Post[];
  services: { id: string; name: string; start: string; end: string }[];
  weeks: Record<string, SpaceWeek>;
  requests: TeamRequest[];
  reads: Record<string, string>;
  absences: { type: AbsenceType; start: string; end: string }[];
};

export type NewRequest = Omit<TeamRequest, "id" | "status" | "createdAt">;

export type SpaceActions = {
  send: (r: NewRequest) => Promise<void>;
  answerPeer: (id: string, accept: boolean) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  markRead: (week: string, version: string) => Promise<void>;
  /** Vérification des règles avant d'envoyer (démo seulement : en vrai, le gérant vérifie). */
  check?: { swap: (r: Extract<TeamRequest, { type: "swap" }>) => Issue[]; claim: (r: Extract<TeamRequest, { type: "claim" }>) => Issue[] };
};

// ---- Démo : construit depuis l'état du gérant -----------------------------------------
export function demoSpace(state: AppState, employeeId: string): Space | null {
  const me = state.employees.find((e) => e.id === employeeId && !e.archived);
  if (!me) return null;
  const weeks: Record<string, SpaceWeek> = {};
  for (const [w, m] of Object.entries(state.weekMeta ?? {})) {
    if (m.status !== "published" || !m.snapshot) continue;
    weeks[w] = { publishedAt: m.publishedAt, snapshot: m.snapshot, openShifts: (m.openShifts ?? []).filter((o) => o.offeredTo.includes(me.id)) };
  }
  const reads: Record<string, string> = {};
  for (const [w, r] of Object.entries(state.reads ?? {})) if (r[me.id]) reads[w] = r[me.id].version;
  return {
    id: "demo",
    name: state.establishment.name,
    me: { id: me.id, firstName: me.firstName, lastName: me.lastName, postIds: me.postIds, contractHours: me.contractHours, unavailability: me.unavailability, prefs: me.prefs },
    colleagues: state.employees.filter((e) => !e.archived).map((e) => ({ id: e.id, firstName: e.firstName, postIds: e.postIds })),
    posts: state.posts,
    services: state.services.map((s) => ({ id: s.id, name: s.name, start: s.start, end: s.end })),
    weeks,
    requests: (state.requests ?? []).filter((r) => r.employeeId === me.id || (r.type === "swap" && r.toEmployeeId === me.id)),
    reads,
    absences: (state.absences ?? []).filter((a) => a.employeeId === me.id).map((a) => ({ type: a.type, start: a.start, end: a.end })),
  };
}

export function demoActions(update: (fn: (s: AppState) => AppState) => void, getState: () => AppState, employeeId: string): SpaceActions {
  return {
    send: async (r) => update((s) => ({ ...s, requests: [...(s.requests ?? []), newRequest(r, r.type === "swap" ? "peer" : "pending")] })),
    answerPeer: async (id, accept) => update((s) => answerPeer(s, id, employeeId, accept)),
    cancel: async (id) => update((s) => cancelRequest(s, id, employeeId)),
    markRead: async (week) => update((s) => markRead(s, week, employeeId)),
    check: { swap: (r) => swapProblems(getState(), r), claim: (r) => claimProblems(getState(), r) },
  };
}

// ---- Vrai compte : lu et écrit dans la base (via les fonctions sécurisées) ----------------
type Raw = Record<string, unknown>;
const iso = (v: unknown) => (v ? new Date(String(v)).toISOString() : undefined);

export function spacesFromRpc(list: Raw[]): Space[] {
  return list.map((x) => {
    const est = x.establishment as Raw;
    const me = x.me as Raw;
    const weeks: Record<string, SpaceWeek> = {};
    for (const w of (x.weeks as Raw[]) ?? []) weeks[String(w.week).slice(0, 10)] = { publishedAt: iso(w.published_at), snapshot: (w.snapshot as Shift[]) ?? [], openShifts: (w.open_shifts as OpenShift[]) ?? [] };
    const reads: Record<string, string> = {};
    for (const [w, v] of Object.entries((x.reads as Raw) ?? {})) reads[w.slice(0, 10)] = iso(v) ?? "";
    return {
      id: String(est.id),
      name: String(est.name),
      me: { id: String(me.id), firstName: String(me.first_name), lastName: String(me.last_name ?? ""), postIds: (me.post_ids as string[]) ?? [], contractHours: Number(me.contract_hours), unavailability: (me.unavailability as Unavailability[]) ?? [], prefs: (me.prefs as EmployeePrefs) ?? undefined },
      colleagues: ((x.colleagues as Raw[]) ?? []).map((c) => ({ id: String(c.id), firstName: String(c.first_name), postIds: (c.post_ids as string[]) ?? [] })),
      posts: ((x.posts as Raw[]) ?? []).map((p) => ({ id: String(p.id), name: String(p.name), color: p.color as Post["color"] })),
      services: ((x.services as Raw[]) ?? []).map((v) => ({ id: String(v.id), name: String(v.name), start: String(v.start), end: String(v.end) })),
      weeks,
      requests: ((x.requests as Raw[]) ?? []).map((q) => ({ ...(q.payload as object), id: String(q.id), employeeId: String(q.employee_id), type: q.type, status: q.status, createdAt: iso(q.created_at) ?? "" }) as TeamRequest),
      reads,
      absences: ((x.absences as Raw[]) ?? []).map((a) => ({ type: a.type as AbsenceType, start: String(a.start).slice(0, 10), end: String(a.end).slice(0, 10) })),
    };
  });
}

export async function loadMySpaces(): Promise<Space[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.rpc("get_my_space");
  if (error) throw error;
  return spacesFromRpc((data as Raw[]) ?? []);
}

export function cloudActions(space: Space, reload: () => Promise<void>): SpaceActions {
  const sb = () => {
    const c = getSupabase();
    if (!c) throw new Error("Comptes non configurés");
    return c;
  };
  const ok = (r: { error: unknown }) => {
    if (r.error) throw r.error;
  };
  return {
    send: async (r) => {
      const full = newRequest(r, r.type === "swap" ? "peer" : "pending");
      const { id, employeeId, status, type, createdAt: _c, ...payload } = full; // eslint-disable-line @typescript-eslint/no-unused-vars
      ok(await sb().from("requests").insert({ establishment_id: space.id, id, employee_id: employeeId, type, status, payload }));
      await reload();
    },
    answerPeer: async (id, accept) => {
      ok(await sb().rpc("answer_peer", { p_est: space.id, p_id: id, p_accept: accept }));
      await reload();
    },
    cancel: async (id) => {
      ok(await sb().rpc("cancel_request", { p_est: space.id, p_id: id }));
      await reload();
    },
    markRead: async (week, version) => {
      await sb().from("week_reads").upsert({ establishment_id: space.id, employee_id: space.me.id, week, version, read_at: new Date().toISOString() });
    },
  };
}
