// Traduction entre l'état de l'application (AppState) et les tables de la base.

import type { AppState, OpenShift, Reads, Rules, Shift, TeamRequest, WeekMeta } from "../types";
import { DEFAULT_RULES } from "../presets";
import { STATE_VERSION } from "../demo-data";
import { addWeeks, mondayOf } from "../time";

type Row = Record<string, unknown>;
export type Rows = {
  establishment: Row;
  rules: Row;
  posts: Row[];
  services: Row[];
  needs: Row[];
  employees: Row[];
  shifts: Row[];
  templates: Row[];
  absences: Row[];
  weeks: Row[];
  requests: Row[];
};

/** Tables « enfants », dans l'ordre où il faut les écrire (parents avant enfants). */
export const CHILD_TABLES = ["posts", "services", "employees", "needs", "shifts", "absences", "templates", "weeks", "requests"] as const;
export type ChildTable = (typeof CHILD_TABLES)[number];

/** Clé unique d'une ligne dans son établissement. */
export function rowKey(table: ChildTable, r: Row): string {
  if (table === "needs") return `${r.day}|${r.service_id}|${r.post_id}`;
  if (table === "weeks") return String(r.week).slice(0, 10);
  return String(r.id);
}

export function toRows(s: AppState, est: string): Rows {
  const r: Rules = { ...DEFAULT_RULES, ...s.rules };
  return {
    establishment: {
      id: est,
      name: s.establishment.name,
      activity: s.establishment.type,
      organisation: s.establishment.organisation,
      opening: s.establishment.opening,
      prep_minutes: s.establishment.prepMinutes,
      close_minutes: s.establishment.closeMinutes,
      closed_holidays: s.establishment.closedHolidays ?? [],
      convention: s.establishment.convention ?? "code",
    },
    rules: {
      establishment_id: est,
      rest_days_per_week: r.restDaysPerWeek,
      consecutive_rest_days: r.consecutiveRestDays,
      min_rest_hours: r.minRestHours,
      max_hours_per_day: r.maxHoursPerDay,
      max_amplitude_hours: r.maxAmplitudeHours,
      split_shifts: r.splitShifts,
      max_splits_per_week: r.maxSplitsPerWeek,
      overtime_hours: r.overtimeHours,
      weekend_fairness: r.weekendFairness,
      notice_part_time_days: r.noticePartTimeDays ?? 7,
      notice_full_time_days: r.noticeFullTimeDays ?? 7,
      labor_target_percent: r.laborTargetPercent ?? 30,
      employer_charges_percent: r.employerChargesPercent ?? 0,
    },
    posts: s.posts.map((p, i) => ({ establishment_id: est, id: p.id, name: p.name, color: p.color, position: i })),
    services: s.services.map((v, i) => ({
      establishment_id: est,
      id: v.id,
      name: v.name,
      start_time: v.start,
      end_time: v.end,
      break_minutes: v.breakMinutes ?? null,
      overrides: v.overrides ?? null,
      days: v.days ?? null,
      position: i,
    })),
    needs: Object.entries(s.needs)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => {
        const [day, service_id, post_id] = k.split("|");
        return { establishment_id: est, day: Number(day), service_id, post_id, count: n };
      }),
    employees: s.employees.map((e, i) => ({
      establishment_id: est,
      id: e.id,
      first_name: e.firstName,
      last_name: e.lastName,
      post_ids: e.postIds,
      contract_hours: e.contractHours,
      unavailability: e.unavailability,
      weekend_history: e.weekendHistory,
      hourly_rate: e.hourlyRate ?? null,
      archived: !!e.archived,
      position: i,
      prefs: e.prefs ?? {},
      email: e.email || null,
    })),
    shifts: Object.entries(s.plans).flatMap(([week, list]) =>
      list.map((x) => ({
        establishment_id: est,
        id: x.id,
        week,
        employee_id: x.employeeId,
        day: x.day,
        start_time: x.start,
        end_time: x.end,
        post_id: x.postId,
        break_minutes: x.breakMinutes ?? null,
        extra: !!x.extra,
        locked: !!x.locked,
        manual: !!x.manual,
        reason: x.reason?.length ? x.reason : null,
      })),
    ),
    templates: s.templates.map((t) => ({ establishment_id: est, id: t.id, name: t.name, weeks: t.weeks })),
    absences: (s.absences ?? []).map((a) => ({ establishment_id: est, id: a.id, employee_id: a.employeeId, type: a.type, start_date: a.start, end_date: a.end })),
    weeks: Object.entries(s.weekMeta ?? {}).map(([week, m]) => ({
      establishment_id: est,
      week,
      status: m.status,
      published_at: m.publishedAt ?? null,
      published_snapshot: m.snapshot ?? null,
      changes: m.changes ?? [],
      locked_employees: m.lockedEmployees ?? [],
      revenue: m.revenue ?? null,
      open_shifts: m.openShifts ?? [],
    })),
    requests: (s.requests ?? []).map((q) => {
      const { id, employeeId, status, createdAt, type, ...payload } = q;
      return { establishment_id: est, id, employee_id: employeeId, type, status, payload, created_at: createdAt };
    }),
  };
}

/** Date ISO stable (la base renvoie « +00:00 », le navigateur « Z »). */
const iso = (v: unknown) => (v ? new Date(String(v)).toISOString() : undefined);

const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));

export function fromRows(rows: Rows, opts: { currentWeek?: string; shareToken?: string } = {}): AppState {
  const e = rows.establishment;
  const r = rows.rules;
  const byPos = (a: Row, b: Row) => Number(a.position ?? 0) - Number(b.position ?? 0);
  const plans: AppState["plans"] = {};
  for (const x of rows.shifts) {
    const w = String(x.week).slice(0, 10);
    (plans[w] ??= []).push({
      id: String(x.id),
      employeeId: String(x.employee_id),
      day: Number(x.day),
      start: String(x.start_time),
      end: String(x.end_time),
      postId: String(x.post_id),
      ...(x.break_minutes != null ? { breakMinutes: Number(x.break_minutes) } : {}),
      ...(x.extra ? { extra: true } : {}),
      ...(x.locked ? { locked: true } : {}),
      ...(x.manual ? { manual: true } : {}),
      ...((x.reason as string[] | null)?.length ? { reason: x.reason as string[] } : {}),
    });
  }
  const weekMeta: NonNullable<AppState["weekMeta"]> = {};
  for (const w of rows.weeks ?? []) {
    const k = String(w.week).slice(0, 10);
    // Ligne créée automatiquement par la base pour une semaine en brouillon, sans rien d'autre : ignorée
    const empty = w.status === "draft" && !w.published_snapshot && !(w.changes as unknown[])?.length && !(w.locked_employees as unknown[])?.length && !w.revenue && !(w.open_shifts as unknown[])?.length;
    if (empty) continue;
    weekMeta[k] = {
      status: w.status === "draft" ? "draft" : "published", // « modifié » se recalcule à partir de la copie publiée
      ...(w.published_at ? { publishedAt: iso(w.published_at) } : {}),
      ...(w.published_snapshot ? { snapshot: w.published_snapshot as Shift[] } : {}),
      changes: (w.changes as NonNullable<WeekMeta["changes"]>) ?? [],
      lockedEmployees: (w.locked_employees as string[]) ?? [],
      ...(w.revenue ? { revenue: w.revenue as (number | null)[] } : {}),
      openShifts: (w.open_shifts as OpenShift[]) ?? [],
    };
  }
  const currentWeek = opts.currentWeek ?? addWeeks(mondayOf(new Date()), 1);
  return {
    version: STATE_VERSION,
    establishment: {
      name: String(e.name),
      type: e.activity as AppState["establishment"]["type"],
      organisation: e.organisation as AppState["establishment"]["organisation"],
      opening: (e.opening as AppState["establishment"]["opening"]) ?? [],
      prepMinutes: Number(e.prep_minutes ?? 0),
      closeMinutes: Number(e.close_minutes ?? 0),
      closedHolidays: (e.closed_holidays as AppState["establishment"]["closedHolidays"]) ?? [],
      convention: String(e.convention ?? "code"),
    },
    rules: {
      restDaysPerWeek: Number(r.rest_days_per_week ?? DEFAULT_RULES.restDaysPerWeek),
      consecutiveRestDays: Boolean(r.consecutive_rest_days ?? DEFAULT_RULES.consecutiveRestDays),
      minRestHours: Number(r.min_rest_hours ?? DEFAULT_RULES.minRestHours),
      maxHoursPerDay: Number(r.max_hours_per_day ?? DEFAULT_RULES.maxHoursPerDay),
      maxAmplitudeHours: Number(r.max_amplitude_hours ?? DEFAULT_RULES.maxAmplitudeHours),
      splitShifts: (r.split_shifts as Rules["splitShifts"]) ?? DEFAULT_RULES.splitShifts,
      maxSplitsPerWeek: Number(r.max_splits_per_week ?? DEFAULT_RULES.maxSplitsPerWeek),
      overtimeHours: Number(r.overtime_hours ?? DEFAULT_RULES.overtimeHours),
      weekendFairness: Boolean(r.weekend_fairness ?? DEFAULT_RULES.weekendFairness),
      noticePartTimeDays: Number(r.notice_part_time_days ?? 7),
      noticeFullTimeDays: Number(r.notice_full_time_days ?? 7),
      laborTargetPercent: Number(r.labor_target_percent ?? 30),
      employerChargesPercent: Number(r.employer_charges_percent ?? 0),
    },
    posts: [...rows.posts].sort(byPos).map((p) => ({ id: String(p.id), name: String(p.name), color: p.color as AppState["posts"][number]["color"] })),
    services: [...rows.services].sort(byPos).map((v) => ({
      id: String(v.id),
      name: String(v.name),
      start: String(v.start_time),
      end: String(v.end_time),
      ...(v.break_minutes != null ? { breakMinutes: Number(v.break_minutes) } : {}),
      ...(v.overrides ? { overrides: v.overrides as AppState["services"][number]["overrides"] } : {}),
      ...(v.days ? { days: (v.days as number[]).map(Number) } : {}),
    })),
    needs: Object.fromEntries(rows.needs.map((n) => [`${n.day}|${n.service_id}|${n.post_id}`, Number(n.count)])),
    employees: [...rows.employees].sort(byPos).map((x) => ({
      id: String(x.id),
      firstName: String(x.first_name),
      lastName: String(x.last_name ?? ""),
      postIds: (x.post_ids as string[]) ?? [],
      contractHours: Number(x.contract_hours),
      unavailability: (x.unavailability as AppState["employees"][number]["unavailability"]) ?? [],
      weekendHistory: Number(x.weekend_history ?? 0),
      ...(num(x.hourly_rate) !== undefined ? { hourlyRate: num(x.hourly_rate) } : {}),
      ...(x.archived ? { archived: true } : {}),
      ...(x.prefs && Object.keys(x.prefs as object).length ? { prefs: x.prefs as AppState["employees"][number]["prefs"] } : {}),
      ...(x.email ? { email: String(x.email) } : {}),
      ...(x.user_id ? { linked: true } : {}),
    })),
    plans,
    templates: rows.templates.map((t) => ({ id: String(t.id), name: String(t.name), weeks: (t.weeks as AppState["templates"][number]["weeks"]) ?? [], createdAt: String(t.created_at ?? "").slice(0, 10) })),
    absences: rows.absences.map((a) => ({ id: String(a.id), employeeId: String(a.employee_id), type: a.type as AppState["absences"][number]["type"], start: String(a.start_date).slice(0, 10), end: String(a.end_date).slice(0, 10) })),
    weekMeta,
    requests: requestsFromRows(rows.requests ?? []),
    currentWeek,
    shareToken: opts.shareToken ?? "",
  };
}

export function requestsFromRows(list: Row[]): TeamRequest[] {
  return [...list]
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((q) => ({ ...(q.payload as object), id: String(q.id), employeeId: String(q.employee_id), status: q.status, type: q.type, createdAt: iso(q.created_at) ?? "" }) as TeamRequest);
}

/** Accusés de lecture lus dans la base. */
export function readsFromRows(list: Row[]): Reads {
  const out: Reads = {};
  for (const r of list) (out[String(r.week).slice(0, 10)] ??= {})[String(r.employee_id)] = { version: iso(r.version) ?? "", at: iso(r.read_at) ?? "" };
  return out;
}

/** JSON dont les clés sont triées : deux objets égaux donnent le même texte (la base réordonne les clés). */
export function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  // Une clé sans valeur (undefined) n'existe pas en JSON : on l'ignore
  if (v && typeof v === "object") return `{${Object.keys(v).filter((k) => (v as Record<string, unknown>)[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}

/** Différences entre deux versions : lignes à écrire et clés à supprimer, par table. */
export function diffRows(prev: Rows | null, next: Rows) {
  const out: { table: ChildTable; upserts: Row[]; deletes: Row[] }[] = [];
  for (const t of CHILD_TABLES) {
    const before = new Map((prev?.[t] ?? []).map((r) => [rowKey(t, r), r]));
    const after = new Map(next[t].map((r) => [rowKey(t, r), r]));
    const upserts = [...after.entries()].filter(([k, r]) => stable(before.get(k)) !== stable(r)).map(([, r]) => r);
    const deletes = [...before.entries()].filter(([k]) => !after.has(k)).map(([, r]) => r);
    if (upserts.length || deletes.length) out.push({ table: t, upserts, deletes });
  }
  const est = stable(prev?.establishment) !== stable(next.establishment);
  const rules = stable(prev?.rules) !== stable(next.rules);
  return { tables: out, establishment: est, rules };
}
