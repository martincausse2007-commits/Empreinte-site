// Équité sur plusieurs semaines : week-ends, fermetures et coupures, calculés
// à partir des plannings des semaines précédentes (et non plus saisis à la main).

import type { AppState, Employee, Shift } from "./types";
import { absRange, dayStats, serviceActive, svTime } from "./rules";
import { addWeeks, toMinutes } from "./time";

export type Fair = { weekends: number; closings: number; splits: number; weeks: number };

/** Heure de fermeture d'un jour : la fin du dernier créneau type de la journée. */
export function closingEnd(state: Pick<AppState, "services">, day: number): number | null {
  let best: number | null = null;
  for (const sv of state.services) {
    if (!serviceActive(sv, day)) continue;
    const t = svTime(sv, day);
    let e = toMinutes(t.end);
    if (e <= toMinutes(t.start)) e += 1440;
    best = best === null ? e : Math.max(best, e);
  }
  return best;
}

export function isClosing(state: Pick<AppState, "services">, s: Pick<Shift, "day" | "start" | "end">) {
  const c = closingEnd(state, s.day);
  if (c === null) return false;
  const [, e] = absRange({ ...s, day: 0 });
  return e >= c - 30; // finit avec la fermeture (à 30 min près)
}

/** Compteurs d'une seule semaine pour un salarié. */
export function weekFair(state: Pick<AppState, "services">, shifts: Shift[]): Omit<Fair, "weeks"> {
  const days = new Set(shifts.map((s) => s.day));
  return {
    weekends: days.has(5) || days.has(6) ? 1 : 0,
    closings: [...days].filter((d) => shifts.some((s) => s.day === d && isClosing(state, s))).length,
    splits: [...days].filter((d) => dayStats(shifts.filter((s) => s.day === d)).split).length,
  };
}

/** Équité sur les `n` semaines AVANT `week`. Sans historique : on reprend le chiffre saisi dans la fiche. */
export function history(state: Pick<AppState, "services" | "plans" | "employees">, week: string, n = 4): Record<string, Fair> {
  const weeks = Array.from({ length: n }, (_, i) => addWeeks(week, -(i + 1))).filter((w) => (state.plans?.[w] ?? []).length > 0);
  const out: Record<string, Fair> = {};
  for (const e of state.employees) {
    const acc: Fair = { weekends: 0, closings: 0, splits: 0, weeks: weeks.length };
    for (const w of weeks) {
      const f = weekFair(state, state.plans[w].filter((s) => s.employeeId === e.id));
      acc.weekends += f.weekends;
      acc.closings += f.closings;
      acc.splits += f.splits;
    }
    // Historique court : on complète avec le chiffre saisi dans la fiche (sur 4 semaines),
    // au prorata des semaines qui manquent encore dans Quinzo.
    if (weeks.length < n) acc.weekends += (e.weekendHistory * (n - weeks.length)) / 4;
    out[e.id] = acc;
  }
  return out;
}

export type FairRow = { employee: Employee; past: Fair; week: Omit<Fair, "weeks">; total: Omit<Fair, "weeks"> };

/** Tableau d'équité (historique + semaine affichée) et écart maximal dans l'équipe. */
export function fairnessTable(state: AppState, week: string, n = 4) {
  const h = history(state, week, n);
  const shifts = state.plans[week] ?? [];
  const rows: FairRow[] = state.employees
    .filter((e) => !e.archived)
    .map((e) => {
      const w = weekFair(state, shifts.filter((s) => s.employeeId === e.id));
      const p = h[e.id];
      return { employee: e, past: p, week: w, total: { weekends: p.weekends + w.weekends, closings: p.closings + w.closings, splits: p.splits + w.splits } };
    });
  // On compare des personnes comparables : celles qui peuvent travailler le week-end
  const eligible = rows.filter((r) => [5, 6].some((d) => !r.employee.unavailability.some((u) => u.day === d && u.serviceId === "all")));
  const spread = (k: keyof FairRow["total"]) => {
    const v = eligible.map((r) => r.total[k] / Math.max(1, r.employee.contractHours / 35));
    return v.length > 1 ? Math.max(...v) - Math.min(...v) : 0;
  };
  const gaps = { weekends: spread("weekends"), closings: spread("closings"), splits: spread("splits") };
  const level: "ok" | "watch" = gaps.weekends > 2.5 || gaps.closings > 4 || gaps.splits > 4 ? "watch" : "ok";
  return { rows, gaps, level, weeks: Math.max(0, ...rows.map((r) => r.past.weeks)) };
}
