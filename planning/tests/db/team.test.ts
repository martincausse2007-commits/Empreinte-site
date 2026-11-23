// Sécurité de l'espace salarié (Row Level Security + fonctions) sur un vrai PostgreSQL.
// Lancement : TEST_DATABASE_URL=postgres://postgres@localhost:54329/postgres npm run test:db
// Ils prouvent qu'un salarié ne voit QUE le planning publié, jamais un brouillon,
// jamais un taux horaire, jamais un autre établissement, et ne peut rien valider lui-même.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL = process.env.TEST_DATABASE_URL;
const run = URL ? describe : describe.skip;
const DB = `quinzo_team_${Date.now()}`;
let admin: Client;
let db: Client;

const BOSS = randomUUID(); // gérant
const OTHER_BOSS = randomUUID(); // gérant d'un autre commerce
const ALICE = randomUUID(); // salariée reliée (e1)
const BOB = randomUUID(); // salarié relié (e2)
const STRANGER = randomUUID(); // compte sans lien
let est = "";
let otherEst = "";

type Q = (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
async function as<T>(user: string | null, fn: (q: Q) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query(`set local role ${user ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user ?? ""]);
    const out = await fn((sql, params) => db.query(sql, params as unknown[]));
    await db.query("commit");
    return out;
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}
const fails = (p: Promise<unknown>) => expect(p).rejects.toThrow();

run("Espace salarié : sécurité", () => {
  beforeAll(async () => {
    admin = new Client({ connectionString: URL });
    await admin.connect();
    await admin.query(`create database ${DB}`);
    db = new Client({ connectionString: URL!.replace(/\/[^/]*$/, `/${DB}`) });
    await db.connect();
    await db.query(readFileSync(join(__dirname, "../../supabase/tests/local_auth_shim.sql"), "utf8"));
    const dir = join(__dirname, "../../supabase/migrations");
    for (const f of readdirSync(dir).sort()) await db.query(readFileSync(join(dir, f), "utf8"));
    for (const id of [BOSS, OTHER_BOSS, ALICE, BOB, STRANGER]) await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id}@test.fr`]);

    est = await as(BOSS, async (q) => (await q("select public.create_establishment('Le Comptoir', 'restaurant') as id")).rows[0].id as string);
    otherEst = await as(OTHER_BOSS, async (q) => (await q("select public.create_establishment('Ailleurs', 'boutique') as id")).rows[0].id as string);
    await as(BOSS, async (q) => {
      await q("insert into public.posts (establishment_id, id, name) values ($1, 'salle', 'Salle')", [est]);
      await q("insert into public.employees (establishment_id, id, first_name, last_name, contract_hours, hourly_rate, post_ids) values ($1, 'e1', 'Alice', 'Martin', 35, 13.5, '{salle}'), ($1, 'e2', 'Bob', 'Petit', 24, 12.1, '{salle}'), ($1, 'e3', 'Chloé', 'Roux', 35, 14, '{salle}')", [est]);
      // Semaine publiée (copie publiée) + brouillon de la semaine suivante
      const snap = JSON.stringify([{ id: "s1", employeeId: "e1", day: 1, start: "11:00", end: "15:00", postId: "salle" }, { id: "s2", employeeId: "e2", day: 2, start: "18:00", end: "23:00", postId: "salle" }]);
      const open = JSON.stringify([{ id: "o1", day: 4, start: "18:00", end: "23:00", postId: "salle", urgent: true, offeredTo: ["e1"], createdAt: "2026-11-23T10:00:00Z" }, { id: "o2", day: 5, start: "18:00", end: "23:00", postId: "salle", offeredTo: ["e3"], createdAt: "2026-11-23T10:00:00Z" }]);
      await q("insert into public.weeks (establishment_id, week, status, published_at, published_snapshot, open_shifts) values ($1, date_trunc('week', current_date)::date, 'published', now(), $2, $3)", [est, snap, open]);
      await q("insert into public.shifts (establishment_id, id, week, employee_id, day, start_time, end_time, post_id) values ($1, 'draft1', (date_trunc('week', current_date) + interval '7 days')::date, 'e1', 0, '09:00', '17:00', 'salle')", [est]);
      await q("insert into public.share_links (establishment_id) values ($1)", [est]);
    });
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${DB}`);
    await admin?.end();
  });

  it("le gérant ne peut pas relier lui-même un compte à un salarié ni choisir le code", async () => {
    await fails(as(BOSS, (q) => q("update public.employees set user_id = $2 where establishment_id = $1 and id = 'e1'", [est, ALICE])));
    await fails(as(BOSS, (q) => q("update public.employees set invite_code = 'abcdefghijklmnopqrstuvwxyz' where establishment_id = $1 and id = 'e1'", [est])));
    await fails(as(BOSS, (q) => q("insert into public.employees (establishment_id, id, first_name, contract_hours, user_id) values ($1, 'e9', 'X', 10, $2)", [est, ALICE])));
  });

  it("seul un membre peut créer une invitation", async () => {
    await fails(as(OTHER_BOSS, (q) => q("select public.create_invite($1, 'e1')", [est])));
    await fails(as(STRANGER, (q) => q("select public.create_invite($1, 'e1')", [est])));
  });

  it("invitation : la page publique ne montre que le commerce et le prénom ; un faux code ne donne rien", async () => {
    const code = await as(BOSS, async (q) => (await q("select public.create_invite($1, 'e1') as c", [est])).rows[0].c as string);
    expect(code.length).toBeGreaterThanOrEqual(20);
    const info = await as(null, async (q) => (await q("select public.invite_info($1) as i", [code])).rows[0].i);
    expect(info).toEqual({ establishment: "Le Comptoir", first_name: "Alice" });
    expect(await as(null, async (q) => (await q("select public.invite_info('faux-code-qui-n-existe-pas') as i")).rows[0].i)).toBeNull();
    await fails(as(null, (q) => q("select public.accept_invite($1)", [code]))); // il faut un compte
    expect(await as(ALICE, async (q) => (await q("select public.accept_invite($1) as e", [code])).rows[0].e)).toBe(est);
    // Code à usage unique
    await fails(as(STRANGER, (q) => q("select public.accept_invite($1)", [code])));
    const code2 = await as(BOSS, async (q) => (await q("select public.create_invite($1, 'e2') as c", [est])).rows[0].c as string);
    await as(BOB, (q) => q("select public.accept_invite($1)", [code2]));
    // Un même compte ne peut pas prendre la place de deux salariés du même commerce
    const code3 = await as(BOSS, async (q) => (await q("select public.create_invite($1, 'e3') as c", [est])).rows[0].c as string);
    await fails(as(ALICE, (q) => q("select public.accept_invite($1)", [code3])));
  });

  it("le salarié ne lit aucune table du gérant (brouillons, taux horaires, autres commerces)", async () => {
    await as(ALICE, async (q) => {
      for (const t of ["shifts", "weeks", "rules", "templates", "absences", "share_links", "audit_log", "needs", "members"]) {
        const r = await q(`select count(*)::int as n from public.${t}`);
        expect(r.rows[0].n, t).toBe(0);
      }
      // Sa propre fiche seulement
      const emp = await q("select id from public.employees");
      expect(emp.rows.map((r) => r.id)).toEqual(["e1"]);
      expect((await q("update public.employees set contract_hours = 10 where id = 'e1'")).rowCount).toBe(0);
    });
    const rc = await as(ALICE, async (q) => (await q("update public.employees set first_name = 'Hack' where establishment_id = $1", [est])).rowCount);
    expect(rc).toBe(0);
  });

  it("get_my_space : semaine publiée oui, brouillon non, prénoms des collègues sans taux, créneaux libres qui lui sont proposés", async () => {
    const space = await as(ALICE, async (q) => (await q("select public.get_my_space() as s")).rows[0].s as Record<string, unknown>[]);
    expect(space).toHaveLength(1);
    const s = space[0] as { me: Record<string, unknown>; colleagues: Record<string, unknown>[]; weeks: { snapshot: unknown[]; open_shifts: { id: string }[] }[] };
    expect(s.me.id).toBe("e1");
    expect(s.weeks).toHaveLength(1); // pas le brouillon
    expect(JSON.stringify(s)).not.toContain("draft1");
    expect(JSON.stringify(s)).not.toContain("13.5");
    expect(JSON.stringify(s.colleagues)).not.toContain("hourly");
    expect(s.weeks[0].open_shifts.map((o) => o.id)).toEqual(["o1"]); // o2 est proposé à quelqu'un d'autre
    // Un compte sans lien n'a rien
    expect(await as(STRANGER, async (q) => (await q("select public.get_my_space() as s")).rows[0].s)).toEqual([]);
  });

  it("demandes : pour soi seulement, jamais déjà acceptée ; un échange démarre « en attente du collègue »", async () => {
    await as(ALICE, async (q) => {
      await q(`insert into public.requests (establishment_id, id, employee_id, type, status, payload) values ($1, 'r1', 'e1', 'leave', 'pending', '{"absenceType":"cp","start":"2026-12-21","end":"2026-12-23"}')`, [est]);
      await q(`insert into public.requests (establishment_id, id, employee_id, type, status, payload) values ($1, 'r2', 'e1', 'swap', 'peer', '{"week":"2026-11-23","shiftId":"s1","toEmployeeId":"e2"}')`, [est]);
    });
    await fails(as(ALICE, (q) => q(`insert into public.requests (establishment_id, id, employee_id, type, status) values ($1, 'r3', 'e2', 'leave', 'pending')`, [est]))); // au nom de Bob
    await fails(as(ALICE, (q) => q(`insert into public.requests (establishment_id, id, employee_id, type, status) values ($1, 'r4', 'e1', 'leave', 'accepted')`, [est])));
    await fails(as(ALICE, (q) => q(`insert into public.requests (establishment_id, id, employee_id, type, status, payload) values ($1, 'r5', 'e1', 'swap', 'pending', '{"toEmployeeId":"e2"}')`, [est])));
    await fails(as(STRANGER, (q) => q(`insert into public.requests (establishment_id, id, employee_id, type, status) values ($1, 'r6', 'e1', 'leave', 'pending')`, [est])));
    // Elle ne peut pas valider sa demande
    const rc = await as(ALICE, async (q) => (await q("update public.requests set status = 'accepted' where id = 'r1'")).rowCount);
    expect(rc).toBe(0);
  });

  it("échange : seul le collègue visé répond ; ensuite le gérant décide", async () => {
    await fails(as(ALICE, (q) => q("select public.answer_peer($1, 'r2', true)", [est])));
    await as(BOB, (q) => q("select public.answer_peer($1, 'r2', true)", [est]));
    const st = await as(BOSS, async (q) => (await q("select status from public.requests where id = 'r2'")).rows[0].status);
    expect(st).toBe("pending");
    // Bob voit la proposition qui le concerne, mais pas le congé d'Alice
    const seen = await as(BOB, async (q) => (await q("select id from public.requests order by id")).rows.map((r) => r.id));
    expect(seen).toEqual(["r2"]);
    await as(BOSS, (q) => q("update public.requests set status = 'accepted', answered_at = now() where establishment_id = $1 and id = 'r2'", [est]));
  });

  it("annuler : seulement sa propre demande sans réponse", async () => {
    await fails(as(BOB, (q) => q("select public.cancel_request($1, 'r1')", [est])));
    await as(ALICE, (q) => q("select public.cancel_request($1, 'r1')", [est]));
    await fails(as(ALICE, (q) => q("select public.cancel_request($1, 'r2')", [est]))); // déjà acceptée
  });

  it("accusés de lecture : chacun pour soi, lus par le gérant seulement", async () => {
    await as(ALICE, (q) => q("insert into public.week_reads (establishment_id, employee_id, week, version) values ($1, 'e1', date_trunc('week', current_date)::date, now())", [est]));
    await fails(as(ALICE, (q) => q("insert into public.week_reads (establishment_id, employee_id, week, version) values ($1, 'e2', date_trunc('week', current_date)::date, now())", [est])));
    expect(await as(BOB, async (q) => (await q("select count(*)::int as n from public.week_reads")).rows[0].n)).toBe(0);
    expect(await as(BOSS, async (q) => (await q("select count(*)::int as n from public.week_reads")).rows[0].n)).toBe(1);
    expect(await as(OTHER_BOSS, async (q) => (await q("select count(*)::int as n from public.week_reads")).rows[0].n)).toBe(0);
  });

  it("notifications : un abonnement n'est lisible que par son propriétaire et le gérant de ses commerces", async () => {
    await as(ALICE, (q) => q("insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/alice', 'k', 'a')"));
    await fails(as(ALICE, (q) => q("insert into public.push_subscriptions (endpoint, user_id, p256dh, auth) values ('https://push.example/fake', $1, 'k', 'a')", [BOB])));
    expect(await as(BOSS, async (q) => (await q("select count(*)::int as n from public.push_subscriptions")).rows[0].n)).toBe(1);
    expect(await as(BOB, async (q) => (await q("select count(*)::int as n from public.push_subscriptions")).rows[0].n)).toBe(0);
    expect(await as(OTHER_BOSS, async (q) => (await q("select count(*)::int as n from public.push_subscriptions")).rows[0].n)).toBe(0);
  });

  it("lien public sans compte : semaine publiée seulement, ni brouillon, ni taux, ni nom de famille", async () => {
    const token = await as(BOSS, async (q) => (await q("select token from public.share_links where establishment_id = $1", [est])).rows[0].token as string);
    const p = await as(null, async (q) => (await q("select public.get_public_planning($1) as p", [token])).rows[0].p as Record<string, unknown>);
    expect(p.establishment).toBe("Le Comptoir");
    const txt = JSON.stringify(p);
    expect(txt).not.toContain("draft1");
    expect(txt).not.toContain("Martin");
    expect(txt).not.toContain("13.5");
    expect(await as(null, async (q) => (await q("select public.get_public_planning('mauvais-jeton-mauvais-jeton') as p")).rows[0].p)).toBeNull();
    // Lien révoqué : plus rien
    await as(BOSS, (q) => q("update public.share_links set revoked_at = now() where token = $1", [token]));
    expect(await as(null, async (q) => (await q("select public.get_public_planning($1) as p", [token])).rows[0].p)).toBeNull();
  });

  it("le gérant peut retirer l'accès ; le salarié perd tout aussitôt", async () => {
    await as(BOSS, (q) => q("update public.employees set user_id = null where establishment_id = $1 and id = 'e2'", [est]));
    expect(await as(BOB, async (q) => (await q("select public.get_my_space() as s")).rows[0].s)).toEqual([]);
    expect(await as(BOB, async (q) => (await q("select count(*)::int as n from public.requests")).rows[0].n)).toBe(0);
  });

  it("un autre gérant ne voit rien de tout cela", async () => {
    void otherEst;
    await as(OTHER_BOSS, async (q) => {
      for (const t of ["requests", "week_reads", "employees"]) expect((await q(`select count(*)::int as n from public.${t} where establishment_id = $1`, [est])).rows[0].n, t).toBe(0);
    });
  });
});
