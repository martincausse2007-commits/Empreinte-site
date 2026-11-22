// Remplacement : quand quelqu'un est absent, les remplaçants possibles,
// classés (poste, heures restantes, repos respectés). Même module de vérification
// que tout le reste : un remplaçant proposé n'enfreint jamais une règle interdite.

import type { AppState, Employee, Shift } from "./types";
import { checkEmployee } from "./engine/check";
import { absencesForWeek, expectedHours } from "./absences";
import { rulesOf, shiftHours } from "./rules";
import { addWeeks } from "./time";
import { forWeek } from "./week";

export type Candidate = {
  employee: Employee;
  remaining: number; // heures encore à planifier avant d'atteindre le contrat
  mainPost: boolean;
  newWarnings: string[]; // points d'attention que le remplacement créerait
  /** Seul obstacle : dépasser son contrat (heures sup). Proposé en second choix. */
  overContract?: number;
};

export function replacementCandidates(state0: AppState, week: string, shifts: Shift[], shift: Shift): Candidate[] {
  const state = forWeek(state0, week);
  const absent = absencesForWeek(state, week);
  const prevWeek = state.plans[addWeeks(week, -1)] ?? [];
  const out: Candidate[] = [];
  for (const e of state.employees) {
    if (e.archived || e.id === shift.employeeId || !e.postIds.includes(shift.postId)) continue;
    const mine = shifts.filter((s) => s.employeeId === e.id && s.id !== shift.id);
    const opts = { prev: prevWeek.filter((s) => s.employeeId === e.id && s.day === 6), absent: absent.get(e.id) };
    const before = checkEmployee(state, e, mine, opts);
    const after = checkEmployee(state, e, [...mine, { ...shift, employeeId: e.id }], opts);
    const known = new Set(before.map((i) => i.id));
    const added = after.filter((i) => !known.has(i.id));
    const errors = added.filter((i) => i.severity === "error");
    // Le seul blocage est le dépassement du contrat : proposé quand même, en second choix
    if (errors.some((i) => i.kind !== "contractOver")) continue;
    const planned = mine.reduce((a, s) => a + shiftHours(s), 0);
    const remaining = expectedHours(e, absent.get(e.id), rulesOf(state)) - planned;
    out.push({
      employee: e,
      remaining,
      mainPost: e.postIds[0] === shift.postId,
      newWarnings: added.filter((i) => i.severity === "warning" && i.kind !== "contractUnder").map((i) => i.title),
      overContract: errors.length ? shiftHours(shift) - remaining : undefined,
    });
  }
  // Poste principal d'abord, puis ceux à qui il manque le plus d'heures, puis le moins de points d'attention
  return out.sort(
    (a, b) =>
      Number(!!a.overContract) - Number(!!b.overContract) ||
      Number(b.mainPost) - Number(a.mainPost) ||
      Number(a.remaining < shiftHours(shift) - 0.01) - Number(b.remaining < shiftHours(shift) - 0.01) ||
      a.newWarnings.length - b.newWarnings.length ||
      b.remaining - a.remaining,
  );
}
