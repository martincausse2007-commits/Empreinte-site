// Vérifie que les données de l'application entrent dans la base (contraintes,
// clés, sécurité RLS) et en ressortent identiques.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CHILD_TABLES, fromRows, stable, toRows, type Rows } from "@/lib/cloud/mapping";
import { createDemoState } from "@/lib/demo-data";
import { ACTIVITIES } from "@/lib/presets";
import { draftFor, exampleTeam, stateFromDraft } from "@/lib/setup";
import { generateWeek } from "@/lib/generate";
import type { AppState } from "@/lib/types";

const URL = process.env.TEST_DATABASE_URL;
const run = URL ? describe : describe.skip;
const DB = `quinzo_sync_${Date.now()}`;
let admin: Client;
let db: Client;

async function asUser<T>(user: string, fn: () => Promise<T>) {
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user]);
    const out = await fn();
    await db.query("commit");
    return out;
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}

/** Enregistre un état complet comme le ferait l'application, puis le relit. */
async function roundTrip(state: AppState) {
  const user = randomUUID();
  await db.query("insert into auth.users (id, email) values ($1, $2)", [user, `${user}@test.fr`]);
  return asUser(user, async () => {
    const est = (await db.query("select public.create_establishment($1, $2) as id", [state.establishment.name, state.establishment.type])).rows[0].id as string;
    const rows = toRows(state, est);
    const { id: _id, ...fields } = rows.establishment; // eslint-disable-line @typescript-eslint/no-unused-vars
    await db.query(`update public.establishments set (${Object.keys(fields).join(",")}) = (select ${Object.keys(fields).join(",")} from json_populate_record(null::public.establishments, $1)) where id = $2`, [JSON.stringify(fields), est]);
    const rc = Object.keys(rows.rules).filter((k) => k !== "establishment_id").join(",");
    await db.query(`update public.rules r set (${rc}) = (select ${rc} from json_populate_record(null::public.rules, $1)) where establishment_id = $2`, [JSON.stringify(rows.rules), est]);
    for (const t of CHILD_TABLES) {
      if (!rows[t].length) continue;
      // Comme l'application : seules les colonnes envoyées sont écrites (les autres prennent leur valeur par défaut)
      const keys = Object.keys(rows[t][0]);
      const cols = keys.join(",");
      // Comme l'application (upsert) : la base a déjà créé les lignes « semaine » des créneaux
      const upsert = t === "weeks" ? ` on conflict (establishment_id, week) do update set (${cols}) = (select ${keys.map((k) => `excluded.${k}`).join(",")})` : "";
      await db.query(`insert into public.${t} (${cols}) select ${cols} from json_populate_recordset(null::public.${t}, $1)${upsert}`, [JSON.stringify(rows[t])]);
    }
    const back: Rows = {
      establishment: (await db.query("select * from public.establishments where id = $1", [est])).rows[0],
      rules: (await db.query("select * from public.rules where establishment_id = $1", [est])).rows[0],
      ...(Object.fromEntries(await Promise.all(CHILD_TABLES.map(async (t) => [t, (await db.query(`select * from public.${t} where establishment_id = $1`, [est])).rows]))) as Omit<Rows, "establishment" | "rules">),
    };
    // Les dates reviennent en objets Date : on les remet au format AAAA-MM-JJ
    const iso = (d: unknown) => (d instanceof Date ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : d);
    back.shifts = back.shifts.map((s) => ({ ...s, week: iso(s.week) }));
    back.absences = back.absences.map((a) => ({ ...a, start_date: iso(a.start_date), end_date: iso(a.end_date) }));
    // Horodatages : texte ISO, comme les renvoie Supabase
    const ts = (d: unknown) => (d instanceof Date ? d.toISOString() : d);
    back.weeks = back.weeks.map((w) => ({ ...w, week: iso(w.week), published_at: ts(w.published_at) }));
    back.requests = back.requests.map((r) => ({ ...r, created_at: ts(r.created_at), answered_at: ts(r.answered_at) }));
    return { est, back };
  });
}

run("Enregistrement des données dans la base", () => {
  beforeAll(async () => {
    admin = new Client({ connectionString: URL });
    await admin.connect();
    await admin.query(`create database ${DB}`);
    db = new Client({ connectionString: URL!.replace(/\/[^/]*$/, `/${DB}`) });
    await db.connect();
    await db.query(readFileSync(join(__dirname, "../../supabase/tests/local_auth_shim.sql"), "utf8"));
    const dir = join(__dirname, "../../supabase/migrations");
    for (const f of readdirSync(dir).sort()) await db.query(readFileSync(join(dir, f), "utf8"));
  });
  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${DB}`);
    await admin?.end();
  });

  const cases: [string, () => AppState][] = [
    [
      "démo du restaurant (avec plannings, absences, modèles)",
      () => {
        const s = createDemoState();
        return { ...s, plans: { ...s.plans, [s.currentWeek]: generateWeek(s).shifts } };
      },
    ],
    ...ACTIVITIES.map((a): [string, () => AppState] => [
      `questionnaire « ${a.label} »`,
      () => {
        const d = draftFor(a.id, `Test ${a.label}`);
        d.employees = exampleTeam(d);
        const s = stateFromDraft(d);
        return { ...s, plans: { [s.currentWeek]: generateWeek(s).shifts } };
      },
    ]),
  ];

  for (const [label, make] of cases) {
    it(`${label} : les données reviennent identiques`, async () => {
      const state = make();
      const { est, back } = await roundTrip(state);
      const again = fromRows(back, { currentWeek: state.currentWeek, shareToken: state.shareToken });
      const a = toRows(state, est);
      const b = toRows(again, est);
      for (const t of CHILD_TABLES) {
        const sort = (l: Record<string, unknown>[]) => l.map(stable).sort();
        expect(sort(b[t]), t).toEqual(sort(a[t]));
      }
      expect(stable(b.establishment)).toEqual(stable(a.establishment));
      expect(stable(b.rules)).toEqual(stable(a.rules));
    });
  }
});
