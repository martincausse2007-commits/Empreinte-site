// Fausses données pour la maquette : un restaurant de 10 personnes
// (le questionnaire de configuration crée ensuite les vraies données).

import type { AppState, Employee, Needs, Post, Service, TeamRequest, Template } from "./types";
import { snapshotOf } from "./publish";
import { offerShift, openCandidates, swapProblems } from "./requests";
import { DEFAULT_RULES } from "./presets";
import { needKey } from "./rules";
import { generateWeek } from "./generate";
import { addWeeks, dateOfDay, mondayOf, toISODate } from "./time";

export const STATE_VERSION = 4;

const RESTAURANT_POSTS: Post[] = [
  { id: "salle", name: "Salle", color: "blue" },
  { id: "cuisine", name: "Cuisine", color: "teal" },
  { id: "bar", name: "Bar", color: "violet" },
];

const RESTAURANT_SERVICES: Service[] = [
  { id: "midi", name: "Midi", start: "11:00", end: "15:00" },
  { id: "soir", name: "Soir", start: "18:00", end: "23:00" },
];

const allDay = (days: number[]) => days.map((day) => ({ day, serviceId: "all" as const }));

function restaurantEmployees(): Employee[] {
  return [
    { id: "e1", hourlyRate: 13.5, firstName: "Camille", lastName: "Martin", postIds: ["salle", "bar"], contractHours: 35, unavailability: [], weekendHistory: 3 },
    { id: "e2", hourlyRate: 12.8, firstName: "Lucas", lastName: "Bernard", postIds: ["salle"], contractHours: 35, unavailability: [], weekendHistory: 2 },
    { id: "e3", hourlyRate: 12.5, firstName: "Inès", lastName: "Petit", postIds: ["salle"], contractHours: 30, unavailability: allDay([2]), weekendHistory: 4 },
    { id: "e4", hourlyRate: 12.0, firstName: "Hugo", lastName: "Moreau", postIds: ["salle", "bar"], contractHours: 24, unavailability: [], prefs: { timeWindows: [{ days: [1, 2, 3], from: "17:00", label: "étudiant, cours du mardi au jeudi" }], preferredServices: ["soir"] }, weekendHistory: 1 },
    { id: "e5", hourlyRate: 17.0, firstName: "Thomas", lastName: "Laurent", postIds: ["cuisine"], contractHours: 39, unavailability: [], weekendHistory: 3 },
    { id: "e6", hourlyRate: 14.5, firstName: "Sarah", lastName: "Dubois", postIds: ["cuisine"], contractHours: 39, unavailability: allDay([6]), weekendHistory: 2 },
    { id: "e7", hourlyRate: 13.5, firstName: "Karim", lastName: "Benali", postIds: ["cuisine"], contractHours: 35, unavailability: [], weekendHistory: 1 },
    { id: "e8", hourlyRate: 13.0, firstName: "Léa", lastName: "Fontaine", postIds: ["bar", "salle"], contractHours: 35, unavailability: [], weekendHistory: 2, prefs: { preferredServices: ["soir"] } },
    { id: "e9", hourlyRate: 12.0, firstName: "Nathan", lastName: "Girard", postIds: ["bar"], contractHours: 20, unavailability: allDay([0, 1]), weekendHistory: 0 },
    { id: "e10", hourlyRate: 11.9, firstName: "Manon", lastName: "Roux", postIds: ["salle"], contractHours: 15, unavailability: allDay([0, 1, 2, 3, 4]), weekendHistory: 4 },
  ];
}

function restaurantNeeds(): Needs {
  const n: Needs = {};
  const set = (days: number[], sv: string, post: string, v: number) => days.forEach((d) => (n[needKey(d, sv, post)] = v));
  // Lundi : fermé. Mardi → samedi midi et soir. Dimanche : midi seulement.
  set([1, 2, 3, 4], "midi", "salle", 2);
  set([1, 2, 3, 4], "midi", "cuisine", 2);
  set([5], "midi", "salle", 2);
  set([5], "midi", "cuisine", 2);
  set([5], "midi", "bar", 1);
  set([6], "midi", "salle", 3);
  set([6], "midi", "cuisine", 2);
  set([6], "midi", "bar", 1);
  set([1, 2, 3], "soir", "salle", 2);
  set([1, 2, 3], "soir", "cuisine", 2);
  set([1, 2, 3], "soir", "bar", 1);
  set([4, 5], "soir", "salle", 3);
  set([4, 5], "soir", "cuisine", 2);
  set([4, 5], "soir", "bar", 2);
  return n;
}

export function createDemoState(name?: string): AppState {
  const base = {
    posts: RESTAURANT_POSTS,
    services: RESTAURANT_SERVICES,
    employees: restaurantEmployees(),
    needs: restaurantNeeds(),
    rules: { ...DEFAULT_RULES, splitShifts: "often" as const, maxHoursPerDay: 11 }, // convention HCR
  };

  // Semaine à préparer = la semaine prochaine. La semaine en cours est déjà remplie.
  const nextWeek = addWeeks(mondayOf(new Date()), 1);
  const thisWeek = addWeeks(nextWeek, -1);
  const strip = <T extends { id: string }>(arr: T[]) => arr.map(({ id: _id, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars

  const weekA = generateWeek(base, { seed: 0 }).shifts;
  const flipped = { ...base, employees: base.employees.map((e) => ({ ...e, weekendHistory: 4 - e.weekendHistory })) };
  const weekB = generateWeek(flipped, { seed: 0 }).shifts;

  const templates: Template[] = [
    { id: "t1", name: "Semaine type", weeks: [strip(weekA)], createdAt: thisWeek },
    { id: "t2", name: "Roulement week-ends A / B", weeks: [strip(weekA), strip(weekB)], createdAt: thisWeek },
  ];

  const current = generateWeek(base, { seed: 3 }).shifts;
  const state: AppState = {
    version: STATE_VERSION,
    establishment: {
      name: name || "Le Comptoir des Halles",
      type: "restaurant",
      organisation: "coupure",
      opening: [[], ...Array.from({ length: 5 }, () => [{ start: "11:30", end: "14:30" }, { start: "18:30", end: "22:30" }]), [{ start: "11:30", end: "14:30" }]],
      prepMinutes: 30,
      closeMinutes: 30,
      convention: "1979", // Hôtels, cafés, restaurants
    },
    ...base,
    plans: { [thisWeek]: current, [nextWeek]: [] },
    templates,
    // Exemple : Léa en congés payés le vendredi et le samedi de la semaine à préparer
    absences: [{ id: "a1", employeeId: "e8", type: "cp", start: toISODate(dateOfDay(nextWeek, 4)), end: toISODate(dateOfDay(nextWeek, 5)) }],
    // La semaine en cours est publiée ; chiffre d'affaires prévu (en euros, saisi à la main)
    weekMeta: {
      [thisWeek]: { status: "published", publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(), snapshot: snapshotOf(current), changes: [], revenue: REVENUE },
      [nextWeek]: { status: "draft", revenue: REVENUE },
    },
    requests: [],
    currentWeek: nextWeek,
    shareToken: "demo-" + Math.random().toString(36).slice(2, 8),
  };
  state.requests = demoRequests(state, thisWeek, nextWeek);
  addDemoTeamActivity(state, thisWeek);
  return state;
}

/** Chiffre d'affaires prévu d'une semaine type (lundi fermé). */
const REVENUE = [null, 1800, 2100, 2300, 3600, 4300, 2700];

/** Demandes d'exemple : 2 changements de disponibilité, 1 congé, 1 échange en attente. */
function demoRequests(state: AppState, thisWeek: string, nextWeek: string): TeamRequest[] {
  const out: TeamRequest[] = [];
  const at = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
  const ines = state.employees.find((e) => e.id === "e3")!;
  out.push({
    id: "rq1",
    type: "availability",
    employeeId: "e3",
    status: "pending",
    createdAt: at(20),
    text: "je peux de nouveau travailler le mercredi soir (plus le midi)",
    unavailability: [...ines.unavailability.filter((u) => u.day !== 2), { day: 2, serviceId: "midi" }],
  });
  out.push({ id: "rq2", type: "availability", employeeId: "e9", status: "pending", createdAt: at(30), text: "plus disponible le dimanche (nouvel emploi)", unavailability: [{ day: 0, serviceId: "all" }, { day: 1, serviceId: "all" }, { day: 6, serviceId: "all" }] });
  out.push({ id: "rq3", type: "leave", employeeId: "e7", status: "pending", createdAt: at(6), absenceType: "cp", start: toISODate(dateOfDay(addWeeks(nextWeek, 2), 1)), end: toISODate(dateOfDay(addWeeks(nextWeek, 2), 3)), note: "mariage de ma sœur" });
  // Échange : un créneau de la semaine en cours, proposé à un collègue qui peut le prendre sans enfreindre de règle
  const shifts = state.plans[thisWeek];
  const used = new Set<string>();
  const findSwap = (id: string, status: "pending" | "peer", minDay: number) => {
    for (const s of shifts.filter((x) => x.day >= minDay && !used.has(x.employeeId)).sort((a, b) => b.day - a.day)) {
      for (const to of state.employees.filter((e) => e.id !== s.employeeId && !used.has(e.id) && e.postIds.includes(s.postId))) {
        const r = { id, type: "swap" as const, employeeId: s.employeeId, status, createdAt: at(status === "peer" ? 1 : 3), week: thisWeek, shiftId: s.id, toEmployeeId: to.id };
        if (swapProblems(state, r).length === 0) {
          used.add(s.employeeId).add(to.id);
          return r;
        }
      }
    }
  };
  const sw = findSwap("rq4", "pending", 3);
  if (sw) out.push(sw);
  // Échange proposé à un collègue qui n'a pas encore répondu (visible dans « Voir comme un salarié »)
  const peer = findSwap("rq5", "peer", 2);
  if (peer) out.push(peer);
  return out;
}

/** Accusés de lecture et remplacement urgent d'exemple sur la semaine en cours. */
function addDemoTeamActivity(state: AppState, week: string) {
  const meta = state.weekMeta![week];
  const v = meta.publishedAt!;
  // 7 personnes sur 10 ont ouvert le planning publié
  const seen = state.employees.filter((e) => !e.archived).slice(0, 7);
  state.reads = { [week]: Object.fromEntries(seen.map((e, i) => [e.id, { version: v, at: new Date(new Date(v).getTime() + (i + 1) * 3600000).toISOString() }])) };
  // Fin de semaine : une personne malade, son créneau est proposé en urgence à ceux qui peuvent le prendre
  const busy = new Set((state.requests ?? []).flatMap((r) => (r.type === "swap" ? [r.shiftId, r.employeeId, r.toEmployeeId] : [])));
  const onlyOne = (s: { employeeId: string; day: number }) => state.plans[week].filter((x) => x.employeeId === s.employeeId && x.day === s.day).length === 1;
  const options = state.plans[week].filter((s) => s.day >= 4 && onlyOne(s) && !busy.has(s.id) && !busy.has(s.employeeId)).sort((a, b) => b.day - a.day || b.start.localeCompare(a.start));
  const sick = options.find((s) => openCandidates(state, week, s, s.employeeId).length > 0);
  if (!sick) return;
  const date = toISODate(dateOfDay(week, sick.day));
  state.absences = [...state.absences, { id: "a-sick", employeeId: sick.employeeId, type: "absence", start: date, end: date }];
  const { state: next, open } = offerShift(state, week, { day: sick.day, start: sick.start, end: sick.end, postId: sick.postId, breakMinutes: sick.breakMinutes }, { fromShift: sick, urgent: true, note: "absence de dernière minute" });
  Object.assign(state, next);
  const at = new Date(Date.now() - 2 * 3600000).toISOString();
  state.weekMeta![week] = { ...state.weekMeta![week], changes: [{ at, employeeId: sick.employeeId, text: `${["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][sick.day]} : repos (avant : ${sick.start.replace(":00", "h")}–${sick.end.replace(":00", "h")}) · absence, créneau proposé en urgence` }] };
  if (open.offeredTo[0]) state.requests = [...(state.requests ?? []), { id: "rq6", type: "claim", employeeId: open.offeredTo[0], status: "pending", createdAt: new Date(Date.now() - 1800000).toISOString(), week, openId: open.id }];
}
