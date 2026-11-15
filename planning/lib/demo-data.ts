// Fausses données pour la maquette : un restaurant de 10 personnes
// (et une variante « boutique » si on choisit ce type à l'inscription).

import type { AppState, BusinessType, Employee, Needs, Post, Service, Template } from "./types";
import { needKey } from "./rules";
import { generateWeek } from "./generate";
import { addWeeks, mondayOf } from "./time";

export const STATE_VERSION = 1;

const RESTAURANT_POSTS: Post[] = [
  { id: "salle", name: "Salle", color: "blue" },
  { id: "cuisine", name: "Cuisine", color: "orange" },
  { id: "bar", name: "Bar", color: "violet" },
];

const RESTAURANT_SERVICES: Service[] = [
  { id: "midi", name: "Midi", start: "11:00", end: "15:00" },
  { id: "soir", name: "Soir", start: "18:00", end: "23:00" },
];

const BOUTIQUE_POSTS: Post[] = [
  { id: "vente", name: "Vente", color: "pink" },
  { id: "caisse", name: "Caisse", color: "emerald" },
  { id: "reserve", name: "Réserve", color: "amber" },
];

const BOUTIQUE_SERVICES: Service[] = [
  { id: "matin", name: "Matin", start: "09:30", end: "14:00" },
  { id: "aprem", name: "Après-midi", start: "14:00", end: "19:30" },
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

function boutiqueEmployees(): Employee[] {
  const map: Record<string, string[]> = {
    e1: ["vente", "caisse"], e2: ["vente"], e3: ["caisse", "vente"], e4: ["vente"], e5: ["reserve", "vente"],
    e6: ["vente"], e7: ["caisse"], e8: ["vente", "caisse"], e9: ["reserve"], e10: ["vente"],
  };
  return restaurantEmployees().map((e) => ({
    ...e,
    postIds: map[e.id],
    unavailability: e.unavailability.map((u) => (u.serviceId === "midi" ? { ...u, serviceId: "matin" } : u)),
  }));
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

function boutiqueNeeds(): Needs {
  const n: Needs = {};
  const set = (days: number[], sv: string, post: string, v: number) => days.forEach((d) => (n[needKey(d, sv, post)] = v));
  // Lundi → samedi, dimanche fermé.
  set([0, 1, 2, 3, 4], "matin", "vente", 3);
  set([0, 1, 2, 3, 4], "aprem", "vente", 3);
  set([0, 1, 2, 3, 4, 5], "matin", "caisse", 1);
  set([0, 1, 2, 3, 4, 5], "aprem", "caisse", 1);
  set([5], "matin", "vente", 4);
  set([5], "aprem", "vente", 4);
  set([1, 3], "matin", "reserve", 1);
  return n;
}

export function createDemoState(type: BusinessType = "restaurant", name?: string): AppState {
  const isResto = type === "restaurant";
  const base = {
    posts: isResto ? RESTAURANT_POSTS : BOUTIQUE_POSTS,
    services: isResto ? RESTAURANT_SERVICES : BOUTIQUE_SERVICES,
    employees: isResto ? restaurantEmployees() : boutiqueEmployees(),
    needs: isResto ? restaurantNeeds() : boutiqueNeeds(),
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
      name: name || (isResto ? "Le Comptoir des Halles" : "Maison Lumen"),
      type,
    },
    ...base,
    plans: { [thisWeek]: generateWeek(base, { seed: 3 }).shifts, [nextWeek]: [] },
    templates,
    currentWeek: nextWeek,
    shareToken: "demo-" + Math.random().toString(36).slice(2, 8),
  };
}
