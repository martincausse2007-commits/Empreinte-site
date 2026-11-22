// Suppression d'un salarié avec anonymisation de l'historique.
// Les semaines passées gardent les créneaux (pour les comptes), mais plus
// aucune donnée personnelle : ni nom, ni taux horaire, ni disponibilités, ni absences.

import type { AppState } from "./types";
import { mondayOf } from "./time";

export function deleteEmployee(state: AppState, id: string, today = new Date()): AppState {
  const thisWeek = mondayOf(today);
  const archivedCount = state.employees.filter((e) => e.archived).length;
  const hasHistory = Object.entries(state.plans).some(([w, list]) => w < thisWeek && list.some((s) => s.employeeId === id));
  const employees = hasHistory
    ? state.employees.map((e) =>
        e.id === id
          ? { id: e.id, firstName: "Ancien salarié", lastName: `n°${archivedCount + 1}`, postIds: e.postIds, contractHours: e.contractHours, unavailability: [], weekendHistory: 0, archived: true }
          : e,
      )
    : state.employees.filter((e) => e.id !== id);
  return {
    ...state,
    employees,
    // Semaine en cours et suivantes : ses créneaux sont retirés
    plans: Object.fromEntries(Object.entries(state.plans).map(([w, list]) => [w, w >= thisWeek ? list.filter((s) => s.employeeId !== id) : list])),
    absences: (state.absences ?? []).filter((a) => a.employeeId !== id),
    templates: state.templates.map((t) => ({ ...t, weeks: t.weeks.map((w) => w.filter((s) => s.employeeId !== id)) })),
  };
}
