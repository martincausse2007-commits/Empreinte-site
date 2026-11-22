// Tests de sécurité de la base (Row Level Security) sur un vrai PostgreSQL.
// Lancement : TEST_DATABASE_URL=postgres://postgres@localhost:54329/postgres npm run test:db
// Ils prouvent qu'un établissement ne voit JAMAIS les données d'un autre.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL = process.env.TEST_DATABASE_URL;
const run = URL ? describe : describe.skip;
const DB = `quinzo_test_${Date.now()}`;
let admin: Client;
let db: Client;

const A = randomUUID(); // gérant A
const B = randomUUID(); // gérant B (autre établissement)
const C = randomUUID(); // manager invité par A
let estA = "";
let estB = "";

/** Exécute des requêtes « en tant que » un utilisateur connecté (ou anonyme si user = null). */
async function as<T>(user: string | null, fn: (q: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>) => Promise<T>): Promise<T> {
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

run("Sécurité de la base (RLS)", () => {
  beforeAll(async () => {
    admin = new Client({ connectionString: URL });
    await admin.connect();
    await admin.query(`create database ${DB}`);
    db = new Client({ connectionString: URL!.replace(/\/[^/]*$/, `/${DB}`) });
    await db.connect();
    await db.query(readFileSync(join(__dirname, "../../supabase/tests/local_auth_shim.sql"), "utf8"));
    const dir = join(__dirname, "../../supabase/migrations");
    for (const f of readdirSync(dir).sort()) await db.query(readFileSync(join(dir, f), "utf8"));
    for (const [id, email] of [[A, "a@test.fr"], [B, "b@test.fr"], [C, "c@test.fr"]]) await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);

    estA = await as(A, async (q) => (await q("select public.create_establishment('Chez A', 'restaurant') as id")).rows[0].id as string);
    estB = await as(B, async (q) => (await q("select public.create_establishment('Chez B', 'boutique') as id")).rows[0].id as string);
    await as(A, async (q) => {
      await q("insert into public.employees (establishment_id, id, first_name, contract_hours) values ($1, 'e1', 'Alice', 35)", [estA]);
      await q("insert into public.shifts (establishment_id, id, week, employee_id, day, start_time, end_time, post_id) values ($1, 's1', '2026-11-23', 'e1', 1, '11:00', '15:00', 'salle')", [estA]);
      await q("insert into public.absences (establishment_id, id, employee_id, type, start_date, end_date) values ($1, 'a1', 'e1', 'cp', '2026-11-27', '2026-11-28')", [estA]);
      await q("insert into public.share_links (establishment_id) values ($1)", [estA]);
    });
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${DB}`);
    await admin?.end();
  });

  it("le créateur devient propriétaire de son établissement", async () => {
    const rows = await as(A, async (q) => (await q("select role from public.members where establishment_id = $1", [estA])).rows);
    expect(rows).toEqual([{ role: "owner" }]);
  });

  it("B ne voit AUCUNE donnée de l'établissement de A", async () => {
    await as(B, async (q) => {
      for (const t of ["establishments", "members", "rules", "employees", "shifts", "absences", "share_links", "audit_log", "weeks"]) {
        const col = t === "establishments" ? "id" : "establishment_id";
        const r = await q(`select count(*)::int as n from public.${t} where ${col} = $1`, [estA]);
        expect(r.rows[0].n, t).toBe(0);
      }
    });
  });

  it("B ne peut pas écrire dans l'établissement de A", async () => {
    await expect(as(B, (q) => q("insert into public.employees (establishment_id, id, first_name, contract_hours) values ($1, 'x', 'Intrus', 35)", [estA]))).rejects.toThrow(/row-level security/);
    await expect(as(B, (q) => q("insert into public.shifts (establishment_id, id, week, employee_id, day, start_time, end_time, post_id) values ($1, 'x', '2026-11-23', 'e1', 2, '11:00', '15:00', 'salle')", [estA]))).rejects.toThrow();
  });

  it("B ne peut ni modifier ni supprimer les données de A (0 ligne touchée)", async () => {
    const upd = await as(B, (q) => q("update public.shifts set start_time = '05:00' where establishment_id = $1", [estA]));
    const del = await as(B, (q) => q("delete from public.employees where establishment_id = $1", [estA]));
    const est = await as(B, (q) => q("update public.establishments set name = 'Piraté' where id = $1", [estA]));
    expect([upd.rowCount, del.rowCount, est.rowCount]).toEqual([0, 0, 0]);
    const name = await as(A, async (q) => (await q("select name from public.establishments where id = $1", [estA])).rows[0].name);
    expect(name).toBe("Chez A");
  });

  it("B ne peut pas déplacer une ligne vers l'établissement de A", async () => {
    await as(B, (q) => q("insert into public.posts (establishment_id, id, name) values ($1, 'p', 'Vente')", [estB]));
    await expect(as(B, (q) => q("update public.posts set establishment_id = $1 where establishment_id = $2", [estA, estB]))).rejects.toThrow(/row-level security/);
  });

  it("B ne peut pas s'ajouter comme membre de l'établissement de A", async () => {
    await expect(as(B, (q) => q("insert into public.members (establishment_id, user_id, role) values ($1, $2, 'owner')", [estA, B]))).rejects.toThrow(/row-level security/);
  });

  it("on ne crée pas d'établissement en direct (seulement via create_establishment)", async () => {
    await expect(as(B, (q) => q("insert into public.establishments (name) values ('Fantôme')"))).rejects.toThrow(/row-level security/);
    await expect(as(B, (q) => q("select public.create_establishment('Deuxième', 'bar')"))).rejects.toThrow(/Un seul établissement/);
  });

  it("un visiteur anonyme n'a accès à aucune table", async () => {
    for (const t of ["establishments", "employees", "shifts", "share_links"]) {
      await expect(as(null, (q) => q(`select * from public.${t}`)), t).rejects.toThrow(/permission denied/);
    }
    await expect(as(null, (q) => q("select public.create_establishment('Anonyme')"))).rejects.toThrow(/permission denied/);
  });

  it("un manager invité lit et modifie, mais ne gère ni les membres ni la suppression", async () => {
    await as(A, (q) => q("insert into public.members (establishment_id, user_id, role) values ($1, $2, 'manager')", [estA, C]));
    await as(C, async (q) => {
      expect((await q("select count(*)::int as n from public.employees where establishment_id = $1", [estA])).rows[0].n).toBe(1);
      expect((await q("update public.employees set contract_hours = 30 where establishment_id = $1", [estA])).rowCount).toBe(1);
      expect((await q("delete from public.establishments where id = $1", [estA])).rowCount).toBe(0);
    });
    await expect(as(C, (q) => q("insert into public.members (establishment_id, user_id, role) values ($1, $2, 'manager')", [estA, B]))).rejects.toThrow(/row-level security/);
  });

  it("le journal se remplit tout seul et ne peut pas être falsifié", async () => {
    const n = await as(A, async (q) => (await q("select count(*)::int as n from public.audit_log where establishment_id = $1", [estA])).rows[0].n as number);
    expect(n).toBeGreaterThan(0);
    await expect(as(A, (q) => q("insert into public.audit_log (establishment_id, action, entity) values ($1, 'faux', 'x')", [estA]))).rejects.toThrow(/permission denied/);
    const token = await as(A, async (q) => (await q("select count(*)::int as n from public.audit_log where entity = 'share_links' and entity_id is not null")).rows[0].n);
    expect(token).toBe(0); // le jeton du lien n'est jamais écrit dans le journal
  });

  it("le jeton de partage est long et aléatoire", async () => {
    const t = await as(A, async (q) => (await q("select token from public.share_links where establishment_id = $1", [estA])).rows[0].token as string);
    expect(t.length).toBeGreaterThanOrEqual(43);
  });

  it("les consentements sont personnels et non modifiables", async () => {
    await as(A, (q) => q("insert into public.consents (document, version, establishment_id) values ('dpa', '2026-11', $1)", [estA]));
    expect(await as(B, async (q) => (await q("select count(*)::int as n from public.consents")).rows[0].n)).toBe(0);
    await expect(as(A, (q) => q("update public.consents set version = 'x'"))).rejects.toThrow(/permission denied/);
    await expect(as(B, (q) => q("insert into public.consents (user_id, document, version) values ($1, 'dpa', 'x')", [A]))).rejects.toThrow(/row-level security/);
  });
});
