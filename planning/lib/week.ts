// Contexte d'une semaine précise : jours fériés fermés et absences.
// Toutes les vérifications et la génération passent par ici pour en tenir compte.

import type { AppState, Needs } from "./types";
import { holidaysInWeek, isHolidayClosed } from "./holidays";
import { absencesForWeek } from "./absences";

/** Besoins de la semaine : rien à pourvoir les jours fériés où l'on est fermé. */
export function needsForWeek(state: Pick<AppState, "needs" | "establishment">, week: string): Needs {
  const closedDays = [...holidaysInWeek(week).entries()].filter(([, h]) => isHolidayClosed(state, h.id)).map(([d]) => d);
  if (!closedDays.length) return state.needs;
  return Object.fromEntries(Object.entries(state.needs).filter(([k]) => !closedDays.includes(Number(k.split("|")[0]))));
}

/** État « vu depuis » une semaine : besoins ajustés aux fériés fermés. */
export function forWeek<T extends Pick<AppState, "needs" | "establishment">>(state: T, week: string): T {
  return { ...state, needs: needsForWeek(state, week) };
}

export { absencesForWeek };
