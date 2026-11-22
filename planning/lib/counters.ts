// Compteurs d'heures par salarié, à la semaine et au mois (pour le comptable).

import type { AbsenceType, AppState, Employee, Shift } from "./types";
import { ABSENCE_TYPES, absencesForWeek, expectedHours } from "./absences";
import { rulesOf, shiftHours } from "./rules";
import { addWeeks, dateOfDay, mondayOf, toISODate } from "./time";
import { holidaysInWeek } from "./holidays";

export type Counter = {
  employee: Employee;
  /** Heures du contrat sur la période (mensualisées pour un mois : hebdo × 52 ÷ 12). */
  contract: number;
  /** Heures à planifier : contrat moins absences décomptées. */
  expected: number;
  planned: number;
  /** Heures au-delà de l'attendu, calculées semaine par semaine (sup ou complémentaires). */
  extra: number;
  sundays: number;
  holidays: number;
  absences: Record<AbsenceType, number>;
  /** Coût brut estimé (si un taux horaire est renseigné). */
  cost?: number;
};

const emptyAbs = (): Record<AbsenceType, number> => ({ cp: 0, repos: 0, absence: 0, arret: 0, formation: 0 });

type Acc = { planned: number; expected: number; extra: number; sundays: number; holidays: number; absences: Record<AbsenceType, number> };

/** Ajoute à `acc` les chiffres d'une semaine, pour les seuls jours qui passent le filtre. */
function addWeek(state: AppState, week: string, e: Employee, acc: Acc, inPeriod: (day: number) => boolean, extraCounts: boolean) {
  const rules = rulesOf(state);
  const shifts: Shift[] = (state.plans[week] ?? []).filter((s) => s.employeeId === e.id);
  const absent = absencesForWeek(state, week).get(e.id);
  const fer = holidaysInWeek(week);
  const workdays = Math.max(1, 7 - rules.restDaysPerWeek);
  for (let d = 0; d < 7; d++) {
    if (!inPeriod(d)) continue;
    const today = shifts.filter((s) => s.day === d);
    acc.planned += today.reduce((a, s) => a + shiftHours(s), 0);
    if (today.length && d === 6) acc.sundays++;
    if (today.length && fer.has(d)) acc.holidays++;
    const t = absent?.get(d);
    if (t) {
      acc.absences[t]++;
      if (ABSENCE_TYPES[t].reduces) acc.expected -= e.contractHours / workdays;
    }
  }
  if (extraCounts) {
    const plannedWeek = shifts.reduce((a, s) => a + shiftHours(s), 0);
    acc.extra += Math.max(0, plannedWeek - expectedHours(e, absent, rules));
  }
}

function finish(e: Employee, contract: number, acc: Acc): Counter {
  const expected = Math.max(0, contract + acc.expected);
  return {
    employee: e,
    contract,
    expected,
    planned: acc.planned,
    extra: acc.extra,
    sundays: acc.sundays,
    holidays: acc.holidays,
    absences: acc.absences,
    cost: e.hourlyRate ? Math.round(acc.planned * e.hourlyRate * 100) / 100 : undefined,
  };
}

const fresh = (): Acc => ({ planned: 0, expected: 0, extra: 0, sundays: 0, holidays: 0, absences: emptyAbs() });

export function weekCounters(state: AppState, week: string): Counter[] {
  return state.employees
    .filter((e) => !e.archived || (state.plans[week] ?? []).some((s) => s.employeeId === e.id))
    .map((e) => {
      const acc = fresh();
      addWeek(state, week, e, acc, () => true, true);
      return finish(e, e.contractHours, acc);
    });
}

/** Compteurs d'un mois (month : 0 = janvier). Heures sup : semaines qui se terminent dans le mois. */
export function monthCounters(state: AppState, year: number, month: number): Counter[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks: string[] = [];
  for (let w = mondayOf(first); w <= toISODate(last); w = addWeeks(w, 1)) weeks.push(w);
  const inMonth = (w: string) => (d: number) => {
    const x = dateOfDay(w, d);
    return x.getMonth() === month && x.getFullYear() === year;
  };
  return state.employees
    .filter((e) => !e.archived || weeks.some((w) => (state.plans[w] ?? []).some((s) => s.employeeId === e.id && inMonth(w)(s.day))))
    .map((e) => {
      const acc = fresh();
      for (const w of weeks) addWeek(state, w, e, acc, inMonth(w), dateOfDay(w, 6).getMonth() === month);
      return finish(e, Math.round(((e.contractHours * 52) / 12) * 100) / 100, acc);
    });
}

export const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
