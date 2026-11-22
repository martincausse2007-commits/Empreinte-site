import type { Alert } from "@/lib/engine/check";
import type { AppState, Employee, Shift } from "@/lib/types";

/** Ids des shifts concernés par une alerte bloquante (pour les entourer en rouge). */
export function shiftsInError(alerts: Alert[], shifts: Shift[]): Set<string> {
  const out = new Set<string>();
  for (const a of alerts) {
    if (a.severity !== "error") continue;
    if (a.shiftIds) a.shiftIds.forEach((id) => out.add(id));
    else if (a.employeeId) shifts.filter((s) => s.employeeId === a.employeeId).forEach((s) => out.add(s.id));
  }
  return out;
}

/** Fait défiler jusqu'à un élément et le met en évidence un instant. */
export function flash(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  el.classList.add("ring-4", "ring-brand-400", "ring-inset");
  setTimeout(() => el.classList.remove("ring-4", "ring-brand-400", "ring-inset"), 1800);
  return true;
}

export function fullName(e: Employee) {
  return `${e.firstName} ${e.lastName}`;
}

/** Équipe triée par poste principal, dans l'ordre des postes. */
export function groupByPost(state: AppState, shifts: Shift[] = []) {
  // Anciens salariés (anonymisés) : affichés seulement s'ils ont des créneaux cette semaine
  const visible = state.employees.filter((e) => !e.archived || shifts.some((s) => s.employeeId === e.id));
  state = { ...state, employees: visible };
  return state.posts
    .map((p) => ({ post: p, employees: state.employees.filter((e) => e.postIds[0] === p.id) }))
    .filter((g) => g.employees.length > 0)
    .concat(
      [{ post: { id: "_none", name: "Sans poste", color: "slate" as const }, employees: state.employees.filter((e) => !state.posts.some((p) => p.id === e.postIds[0])) }].filter(
        (g) => g.employees.length > 0,
      ),
    );
}
