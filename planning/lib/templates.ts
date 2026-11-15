import type { AppState, Shift, Template } from "./types";
import { addWeeks } from "./time";

let n = 0;
const fresh = () => `s${Date.now().toString(36)}${(n++).toString(36)}`;

/** Applique un modèle (1 semaine) ou un roulement (N semaines) à partir de `startWeek`. */
export function applyTemplate(state: AppState, t: Template, startWeek: string): AppState {
  const plans = { ...state.plans };
  t.weeks.forEach((w, i) => {
    plans[addWeeks(startWeek, i)] = w
      .filter((s) => state.employees.some((e) => e.id === s.employeeId))
      .map((s) => ({ ...s, id: fresh() }));
  });
  return { ...state, plans };
}

export function copyWeek(shifts: Shift[]): Shift[] {
  return shifts.map((s) => ({ ...s, id: fresh() }));
}

export function makeTemplate(state: AppState, name: string, startWeek: string, weeks: number): Template {
  return {
    id: fresh(),
    name,
    weeks: Array.from({ length: weeks }, (_, i) =>
      (state.plans[addWeeks(startWeek, i)] ?? []).map(({ id: _id, ...rest }) => rest), // eslint-disable-line @typescript-eslint/no-unused-vars
    ),
    createdAt: startWeek,
  };
}
