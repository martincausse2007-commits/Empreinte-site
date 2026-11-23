// Demandes de l'équipe : congés, échanges de créneaux, disponibilités.
// Avant d'accepter un échange, Quinzo vérifie qu'il respecte les règles.

import type { AppState, Shift, TeamRequest } from "./types";
import { checkEmployee, type Issue } from "./engine/check";
import { absencesForWeek } from "./absences";
import { addWeeks } from "./time";
import { forWeek } from "./week";
import { ABSENCE_TYPES } from "./absences";

let n = 0;
const rid = () => `r${Date.now().toString(36)}${(n++).toString(36)}`;

/** Ce que l'échange provoquerait pour la personne qui reprend le créneau (règles interdites). */
export function swapProblems(state: AppState, r: Extract<TeamRequest, { type: "swap" }>): Issue[] {
  const shifts = state.plans[r.week] ?? [];
  const shift = shifts.find((s) => s.id === r.shiftId);
  const to = state.employees.find((e) => e.id === r.toEmployeeId);
  if (!shift || !to) return [{ id: "missing", kind: "overlap", severity: "error", title: "Créneau introuvable", detail: "Ce créneau a été modifié ou supprimé depuis la demande." }];
  const st = forWeek(state, r.week);
  const mine = shifts.filter((s) => s.employeeId === to.id);
  const prev = (state.plans[addWeeks(r.week, -1)] ?? []).filter((s) => s.employeeId === to.id && s.day === 6);
  const opt = { prev, absent: absencesForWeek(state, r.week).get(to.id) };
  const before = new Set(checkEmployee(st, to, mine, opt).map((i) => i.id));
  const moved: Shift = { ...shift, employeeId: to.id };
  const out = checkEmployee(st, to, [...mine, moved], opt).filter((i) => i.severity === "error" && !before.has(i.id));
  if (!to.postIds.includes(shift.postId)) out.push({ id: "post", kind: "offPost", severity: "error", title: `${to.firstName} n'a pas ce poste`, detail: "Le poste n'est pas dans sa fiche." });
  return out;
}

/** Applique une réponse du gérant à une demande. */
export function answerRequest(state: AppState, id: string, accept: boolean): AppState {
  const r = (state.requests ?? []).find((x) => x.id === id);
  if (!r || r.status !== "pending") return state;
  const requests = (state.requests ?? []).map((x) => (x.id === id ? { ...x, status: accept ? ("accepted" as const) : ("refused" as const) } : x));
  if (!accept) return { ...state, requests };
  if (r.type === "leave") {
    return { ...state, requests, absences: [...(state.absences ?? []), { id: rid(), employeeId: r.employeeId, type: r.absenceType, start: r.start, end: r.end }] };
  }
  if (r.type === "availability") {
    return {
      ...state,
      requests,
      employees: state.employees.map((e) => (e.id === r.employeeId ? { ...e, unavailability: r.unavailability, prefs: r.preferences ?? e.prefs } : e)),
    };
  }
  // Échange : le créneau passe à la personne qui l'a accepté
  const list = state.plans[r.week] ?? [];
  return { ...state, requests, plans: { ...state.plans, [r.week]: list.map((s) => (s.id === r.shiftId ? { ...s, employeeId: r.toEmployeeId, manual: true, reason: undefined } : s)) } };
}

export function requestSummary(state: AppState, r: TeamRequest): string {
  const who = state.employees.find((e) => e.id === r.employeeId)?.firstName ?? "?";
  const fmt = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  if (r.type === "leave") return `${who} demande un ${ABSENCE_TYPES[r.absenceType].label.toLowerCase()} ${r.start === r.end ? `le ${fmt(r.start)}` : `du ${fmt(r.start)} au ${fmt(r.end)}`}${r.note ? ` : « ${r.note} »` : ""}`;
  if (r.type === "availability") return `${who} : ${r.text}`;
  const to = state.employees.find((e) => e.id === r.toEmployeeId)?.firstName ?? "?";
  const s = (state.plans[r.week] ?? []).find((x) => x.id === r.shiftId);
  const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  return s ? `${who} propose son créneau du ${days[s.day]} ${s.start.replace(":00", "h").replace(":", "h")}–${s.end.replace(":00", "h").replace(":", "h")} à ${to}, qui a accepté` : `${who} propose un échange à ${to}`;
}

export function newRequest<T extends Omit<TeamRequest, "id" | "status" | "createdAt">>(r: T): TeamRequest {
  return { ...r, id: rid(), status: "pending", createdAt: new Date().toISOString() } as unknown as TeamRequest;
}
