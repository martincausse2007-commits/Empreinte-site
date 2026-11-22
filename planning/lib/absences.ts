// Absences : congés payés, repos demandé, absence, arrêt de travail, formation.
// On ne stocke JAMAIS de motif ni d'information médicale : seulement le type et les dates.

import type { Absence, AbsenceType, AppState, Employee, Rules } from "./types";
import { dateOfDay, toISODate } from "./time";

export const ABSENCE_TYPES: Record<AbsenceType, { label: string; short: string; /** Réduit les heures à planifier (absence rémunérée ou décomptée) */ reduces: boolean }> = {
  cp: { label: "Congé payé", short: "CP", reduces: true },
  repos: { label: "Repos demandé", short: "Repos", reduces: false },
  absence: { label: "Absence", short: "Abs.", reduces: true },
  arret: { label: "Arrêt de travail", short: "Arrêt", reduces: true },
  formation: { label: "Formation", short: "Form.", reduces: true },
};

/** Absences de la semaine : salarié → (jour → type). */
export function absencesForWeek(state: Pick<AppState, "absences">, week: string): Map<string, Map<number, AbsenceType>> {
  const out = new Map<string, Map<number, AbsenceType>>();
  const days = Array.from({ length: 7 }, (_, d) => toISODate(dateOfDay(week, d)));
  for (const a of state.absences ?? []) {
    days.forEach((iso, d) => {
      if (iso >= a.start && iso <= a.end) {
        if (!out.has(a.employeeId)) out.set(a.employeeId, new Map());
        out.get(a.employeeId)!.set(d, a.type);
      }
    });
  }
  return out;
}

/**
 * Heures à planifier dans la semaine : le contrat, moins la part des jours
 * d'absence décomptés (contrat ÷ nombre de jours travaillés par semaine).
 */
export function expectedHours(e: Employee, absent: Map<number, AbsenceType> | undefined, rules: Pick<Rules, "restDaysPerWeek">) {
  if (!absent?.size) return e.contractHours;
  const workdays = Math.max(1, 7 - rules.restDaysPerWeek);
  const counted = Math.min(workdays, [...absent.values()].filter((t) => ABSENCE_TYPES[t].reduces).length);
  return Math.max(0, e.contractHours * (1 - counted / workdays));
}

export function absenceDays(a: Absence) {
  const [y1, m1, d1] = a.start.split("-").map(Number);
  const [y2, m2, d2] = a.end.split("-").map(Number);
  return Math.round((new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()) / 86400000) + 1;
}
