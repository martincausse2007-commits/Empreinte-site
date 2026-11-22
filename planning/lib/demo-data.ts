// Fausses données pour la maquette : un restaurant de 10 personnes
// (le questionnaire de configuration crée ensuite les vraies données).

import type { AppState, Employee, Needs, Post, Service, Template } from "./types";
import { DEFAULT_RULES } from "./presets";
import { needKey } from "./rules";
import { generateWeek } from "./generate";
import { addWeeks, mondayOf } from "./time";

export const STATE_VERSION = 2;

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
    { id: "e1", firstName: "Camille", lastName: "Martin", postIds: ["salle", "bar"], contractHours: 35, unavailability: [], weekendHistory: 3 },
    { id: "e2", firstName: "Lucas", lastName: "Bernard", postIds: ["salle"], contractHours: 35, unavailability: [], weekendHistory: 2 },
    { id: "e3", firstName: "Inès", lastName: "Petit", postIds: ["salle"], contractHours: 30, unavailability: allDay([2]), weekendHistory: 4 },
    { id: "e4", firstName: "Hugo", lastName: "Moreau", postIds: ["salle", "bar"], contractHours: 24, unavailability: [1, 2, 3].map((day) => ({ day, serviceId: "midi" })), weekendHistory: 1 },
    { id: "e5", firstName: "Thomas", lastName: "Laurent", postIds: ["cuisine"], contractHours: 39, unavailability: [], weekendHistory: 3 },
    { id: "e6", firstName: "Sarah", lastName: "Dubois", postIds: ["cuisine"], contractHours: 39, unavailability: allDay([6]), weekendHistory: 2 },
    { id: "e7", firstName: "Karim", lastName: "Benali", postIds: ["cuisine"], contractHours: 35, unavailability: [], weekendHistory: 1 },
    { id: "e8", firstName: "Léa", lastName: "Fontaine", postIds: ["bar", "salle"], contractHours: 35, unavailability: [], weekendHistory: 2 },
    { id: "e9", firstName: "Nathan", lastName: "Girard", postIds: ["bar"], contractHours: 20, unavailability: allDay([0, 1]), weekendHistory: 0 },
    { id: "e10", firstName: "Manon", lastName: "Roux", postIds: ["salle"], contractHours: 15, unavailability: allDay([0, 1, 2, 3, 4]), weekendHistory: 4 },
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
    rules: { ...DEFAULT_RULES, splitShifts: "often" as const },
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

  return {
    version: STATE_VERSION,
    establishment: {
      name: name || "Le Comptoir des Halles",
      type: "restaurant",
      organisation: "coupure",
      opening: [[], ...Array.from({ length: 5 }, () => [{ start: "11:30", end: "14:30" }, { start: "18:30", end: "22:30" }]), [{ start: "11:30", end: "14:30" }]],
      prepMinutes: 30,
      closeMinutes: 30,
    },
    ...base,
    plans: { [thisWeek]: generateWeek(base, { seed: 3 }).shifts, [nextWeek]: [] },
    templates,
    currentWeek: nextWeek,
    shareToken: "demo-" + Math.random().toString(36).slice(2, 8),
  };
}
