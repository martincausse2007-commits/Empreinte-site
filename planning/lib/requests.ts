// Demandes de l'équipe : congés, échanges, disponibilités, créneaux libres.
// Avant d'accepter un échange ou un volontaire, Quinzo vérifie les règles.

import type { AppState, OpenShift, Shift, TeamRequest } from "./types";
import { checkEmployee, type Issue } from "./engine/check";
import { absencesForWeek } from "./absences";
import { addWeeks, formatTime } from "./time";
import { forWeek } from "./week";
import { ABSENCE_TYPES } from "./absences";
import { replacementCandidates } from "./replace";

let n = 0;
const rid = (p = "r") => `${p}${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

type Swap = Extract<TeamRequest, { type: "swap" }>;
type Claim = Extract<TeamRequest, { type: "claim" }>;

/** Règles interdites que provoquerait l'ajout de ce créneau à cette personne. */
export function addProblems(state: AppState, week: string, employeeId: string, shift: Shift): Issue[] {
  const to = state.employees.find((e) => e.id === employeeId);
  if (!to) return [{ id: "missing", kind: "overlap", severity: "error", title: "Salarié introuvable", detail: "" }];
  const shifts = (state.plans[week] ?? []).filter((s) => s.id !== shift.id);
  const st = forWeek(state, week);
  const mine = shifts.filter((s) => s.employeeId === to.id);
  const prev = (state.plans[addWeeks(week, -1)] ?? []).filter((s) => s.employeeId === to.id && s.day === 6);
  const opt = { prev, absent: absencesForWeek(state, week).get(to.id) };
  const before = new Set(checkEmployee(st, to, mine, opt).map((i) => i.id));
  const out = checkEmployee(st, to, [...mine, { ...shift, employeeId: to.id }], opt).filter((i) => i.severity === "error" && !before.has(i.id));
  if (!to.postIds.includes(shift.postId)) out.push({ id: "post", kind: "offPost", severity: "error", title: `${to.firstName} n'a pas ce poste`, detail: "Le poste n'est pas dans sa fiche." });
  return out;
}

/** Ce que l'échange provoquerait pour la personne qui reprend le créneau (règles interdites). */
export function swapProblems(state: AppState, r: Swap): Issue[] {
  const shift = (state.plans[r.week] ?? []).find((s) => s.id === r.shiftId);
  if (!shift) return [{ id: "missing", kind: "overlap", severity: "error", title: "Créneau introuvable", detail: "Ce créneau a été modifié ou supprimé depuis la demande." }];
  return addProblems(state, r.week, r.toEmployeeId, shift);
}

const openOf = (state: AppState, week: string, id: string) => state.weekMeta?.[week]?.openShifts?.find((o) => o.id === id);
const asShift = (o: OpenShift, employeeId: string): Shift => ({ id: o.id, employeeId, day: o.day, start: o.start, end: o.end, postId: o.postId, ...(o.breakMinutes ? { breakMinutes: o.breakMinutes } : {}) });

/** Ce que provoquerait le fait de donner le créneau libre à ce volontaire. */
export function claimProblems(state: AppState, r: Claim): Issue[] {
  const o = openOf(state, r.week, r.openId);
  if (!o) return [{ id: "missing", kind: "overlap", severity: "error", title: "Créneau déjà pris ou retiré", detail: "" }];
  return addProblems(state, r.week, r.employeeId, asShift(o, r.employeeId));
}

/** Personnes à qui proposer un créneau libre : celles qui peuvent le prendre sans enfreindre de règle interdite. */
export function openCandidates(state: AppState, week: string, slot: Omit<OpenShift, "offeredTo" | "createdAt" | "id">, exclude?: string): string[] {
  const temp: Shift = { id: "__open", employeeId: exclude ?? "__personne", day: slot.day, start: slot.start, end: slot.end, postId: slot.postId, breakMinutes: slot.breakMinutes };
  // Les heures en plus restent dans la limite réglée par le gérant (Réglages → heures sup autorisées)
  return replacementCandidates(state, week, state.plans[week] ?? [], temp)
    .filter((c) => c.overContract === undefined)
    .map((c) => c.employee.id);
}

/**
 * Propose un créneau à l'équipe. Si `fromShift` est donné (remplacement urgent),
 * le créneau est retiré à la personne prévue et devient libre.
 */
export function offerShift(state: AppState, week: string, slot: Omit<OpenShift, "offeredTo" | "createdAt" | "id">, opts: { fromShift?: Shift; urgent?: boolean; note?: string } = {}): { state: AppState; open: OpenShift } {
  const offeredTo = openCandidates(state, week, slot, opts.fromShift?.employeeId);
  const open: OpenShift = { ...slot, id: rid("o"), urgent: opts.urgent || undefined, offeredTo, createdAt: new Date().toISOString(), ...(opts.note ? { note: opts.note } : {}) };
  const meta = state.weekMeta?.[week] ?? { status: "draft" as const };
  const plans = opts.fromShift ? { ...state.plans, [week]: (state.plans[week] ?? []).filter((s) => s.id !== opts.fromShift!.id) } : state.plans;
  return { state: { ...state, plans, weekMeta: { ...state.weekMeta, [week]: { ...meta, openShifts: [...(meta.openShifts ?? []), open] } } }, open };
}

export function withdrawOpen(state: AppState, week: string, id: string): AppState {
  const meta = state.weekMeta?.[week];
  if (!meta) return state;
  return {
    ...state,
    weekMeta: { ...state.weekMeta, [week]: { ...meta, openShifts: (meta.openShifts ?? []).filter((o) => o.id !== id) } },
    requests: (state.requests ?? []).map((r) => (r.type === "claim" && r.openId === id && r.status === "pending" ? { ...r, status: "refused" as const } : r)),
  };
}

/** Réponse du gérant à une demande (déjà acceptée par le collègue pour un échange). */
export function answerRequest(state: AppState, id: string, accept: boolean): AppState {
  const r = (state.requests ?? []).find((x) => x.id === id);
  if (!r || r.status !== "pending") return state;
  const set = (list: TeamRequest[], rid0: string, status: TeamRequest["status"]) => list.map((x) => (x.id === rid0 ? ({ ...x, status } as TeamRequest) : x));
  let requests = set(state.requests ?? [], id, accept ? "accepted" : "refused");
  if (!accept) return { ...state, requests };
  if (r.type === "leave") {
    return { ...state, requests, absences: [...(state.absences ?? []), { id: rid("a"), employeeId: r.employeeId, type: r.absenceType, start: r.start, end: r.end }] };
  }
  if (r.type === "availability") {
    return { ...state, requests, employees: state.employees.map((e) => (e.id === r.employeeId ? { ...e, unavailability: r.unavailability, prefs: r.preferences ?? e.prefs } : e)) };
  }
  if (r.type === "claim") {
    const o = openOf(state, r.week, r.openId);
    if (!o) return state;
    // Les autres volontaires pour ce créneau reçoivent un refus
    requests = requests.map((x) => (x.type === "claim" && x.openId === r.openId && x.id !== r.id && x.status === "pending" ? { ...x, status: "refused" as const } : x));
    const meta = state.weekMeta![r.week];
    return {
      ...state,
      requests,
      plans: { ...state.plans, [r.week]: [...(state.plans[r.week] ?? []), { ...asShift(o, r.employeeId), manual: true }] },
      weekMeta: { ...state.weekMeta, [r.week]: { ...meta, openShifts: (meta.openShifts ?? []).filter((x) => x.id !== r.openId) } },
    };
  }
  // Échange : le créneau passe à la personne qui l'a accepté
  const list = state.plans[r.week] ?? [];
  return { ...state, requests, plans: { ...state.plans, [r.week]: list.map((s) => (s.id === r.shiftId ? { ...s, employeeId: r.toEmployeeId, manual: true, reason: undefined } : s)) } };
}

/** Réponse du collègue à qui on propose un échange. */
export function answerPeer(state: AppState, id: string, employeeId: string, accept: boolean): AppState {
  return {
    ...state,
    requests: (state.requests ?? []).map((r) => (r.id === id && r.type === "swap" && r.status === "peer" && r.toEmployeeId === employeeId ? { ...r, status: accept ? ("pending" as const) : ("refused" as const) } : r)),
  };
}

export function cancelRequest(state: AppState, id: string, employeeId: string): AppState {
  return { ...state, requests: (state.requests ?? []).map((r) => (r.id === id && r.employeeId === employeeId && (r.status === "pending" || r.status === "peer") ? { ...r, status: "cancelled" as const } : r)) };
}

const DAYS_LOWER = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const slotText = (s: { day: number; start: string; end: string }) => `${DAYS_LOWER[s.day]} ${formatTime(s.start)}–${formatTime(s.end)}`;

export function requestSummary(state: AppState, r: TeamRequest): string {
  const who = state.employees.find((e) => e.id === r.employeeId)?.firstName ?? "?";
  const fmt = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  if (r.type === "leave") return `${who} demande un ${ABSENCE_TYPES[r.absenceType].label.toLowerCase()} ${r.start === r.end ? `le ${fmt(r.start)}` : `du ${fmt(r.start)} au ${fmt(r.end)}`}${r.note ? ` : « ${r.note} »` : ""}`;
  if (r.type === "availability") return `${who} : ${r.text}`;
  if (r.type === "claim") {
    const o = openOf(state, r.week, r.openId);
    return o ? `${who} veut prendre le créneau libre du ${slotText(o)}` : `${who} voulait prendre un créneau libre (déjà attribué)`;
  }
  const to = state.employees.find((e) => e.id === r.toEmployeeId)?.firstName ?? "?";
  const s = (state.plans[r.week] ?? []).find((x) => x.id === r.shiftId);
  if (!s) return `${who} propose un échange à ${to}`;
  return r.status === "peer" ? `${who} propose son créneau du ${slotText(s)} à ${to} (en attente de sa réponse)` : `${who} propose son créneau du ${slotText(s)} à ${to}, qui a accepté`;
}

export function newRequest<T extends Omit<TeamRequest, "id" | "status" | "createdAt">>(r: T, status: TeamRequest["status"] = "pending"): TeamRequest {
  return { ...r, id: rid(), status, createdAt: new Date().toISOString() } as unknown as TeamRequest;
}

/** Qui a vu la dernière version publiée d'une semaine. */
export function readStatus(state: AppState, week: string) {
  const meta = state.weekMeta?.[week];
  if (!meta || meta.status !== "published" || !meta.snapshot) return null;
  const people = state.employees.filter((e) => !e.archived && meta.snapshot!.some((s) => s.employeeId === e.id));
  const reads = state.reads?.[week] ?? {};
  const seen = people.filter((e) => reads[e.id] && reads[e.id].version >= (meta.publishedAt ?? ""));
  return { seen, notSeen: people.filter((e) => !seen.includes(e)), total: people.length };
}

export function markRead(state: AppState, week: string, employeeId: string): AppState {
  const v = state.weekMeta?.[week]?.publishedAt;
  if (!v) return state;
  return { ...state, reads: { ...state.reads, [week]: { ...state.reads?.[week], [employeeId]: { version: v, at: new Date().toISOString() } } } };
}
