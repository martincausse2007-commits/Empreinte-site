// Questionnaire de configuration : brouillon des réponses et transformation
// en données prêtes à l'emploi.

import type { ActivityId, AppState, Employee, OpeningHours, Organisation, Post, Rules, Service } from "./types";
import { ACTIVITIES, DEFAULT_RULES, activity, buildServices } from "./presets";
import { coverage, needKey, serviceActive, shiftHours, svTime } from "./rules";
import { generateWeek } from "./generate";
import { addWeeks, mondayOf } from "./time";
import { STATE_VERSION } from "./demo-data";

export type SetupPost = Post & { selected: boolean };
export type SetupEmployee = { id: string; firstName: string; lastName: string; postId: string; contractHours: number };

export type SetupDraft = {
  name: string;
  activity: ActivityId;
  opening: OpeningHours;
  organisation: Organisation;
  teams: number;
  prepMinutes: number;
  closeMinutes: number;
  services: Service[];
  posts: SetupPost[];
  /** clé "serviceId|postId" -> besoins en semaine / le week-end */
  needs: Record<string, { weekday: number; weekend: number }>;
  rules: Rules;
  employees: SetupEmployee[];
};

let n = 0;
export const sid = (p: string) => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;

export function draftFor(id: ActivityId, name = ""): SetupDraft {
  const a = activity(id);
  const rules = { ...DEFAULT_RULES, ...a.rules };
  const posts: SetupPost[] = a.posts.map((p, i) => ({ id: `p${i + 1}`, name: p.name, color: p.color, selected: p.selected }));
  const d: SetupDraft = {
    name,
    activity: id,
    opening: a.opening.map((day) => day.map((r) => ({ ...r }))),
    organisation: a.organisation,
    teams: a.teams,
    prepMinutes: a.prepMinutes,
    closeMinutes: a.closeMinutes,
    services: [],
    posts,
    needs: {},
    rules,
    employees: [],
  };
  d.services = rebuildServices(d);
  d.needs = defaultNeeds(d);
  return d;
}

export function rebuildServices(d: SetupDraft): Service[] {
  return buildServices(d.opening, d.organisation, d.teams, d.prepMinutes, d.closeMinutes, d.rules.maxHoursPerDay);
}

/** Besoins proposés : ceux du secteur, sur chaque créneau. */
export function defaultNeeds(d: SetupDraft) {
  const a = activity(d.activity);
  const out: SetupDraft["needs"] = {};
  for (const sv of d.services)
    d.posts.forEach((p, i) => {
      const preset = a.posts[i] ?? { weekday: 1, weekend: 1 };
      out[`${sv.id}|${p.id}`] = d.needs[`${sv.id}|${p.id}`] ?? { weekday: preset.weekday, weekend: preset.weekend };
    });
  return out;
}

export const activePosts = (d: SetupDraft) => d.posts.filter((p) => p.selected && p.name.trim());

/** Heures de travail nécessaires sur une semaine, par poste. */
export function neededHours(d: SetupDraft): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of activePosts(d)) {
    let h = 0;
    for (let day = 0; day < 7; day++)
      for (const sv of d.services) {
        if (!serviceActive(sv, day)) continue;
        const need = d.needs[`${sv.id}|${p.id}`];
        const count = need ? (day >= 5 ? need.weekend : need.weekday) : 0;
        h += count * shiftHours({ ...svTime(sv, day), breakMinutes: sv.breakMinutes });
      }
    out[p.id] = h;
  }
  return out;
}

const FIRST = ["Camille", "Lucas", "Inès", "Hugo", "Sarah", "Thomas", "Léa", "Karim", "Manon", "Nathan", "Chloé", "Yanis", "Emma", "Rayan", "Jade", "Théo", "Lina", "Adam", "Zoé", "Noah", "Alice", "Mehdi", "Clara", "Louis"];
const LAST = ["Martin", "Bernard", "Petit", "Moreau", "Dubois", "Laurent", "Fontaine", "Benali", "Roux", "Girard", "Lefèvre", "Mercier", "Garnier", "Faure", "Chevalier", "Robin", "Masson", "Blanc", "Diallo", "Henry", "Perrin", "Morel", "Nicolas", "Lambert"];

/** Équipe d'exemple : dimensionnée d'après les besoins, puis vérifiée en générant une semaine test. */
export function exampleTeam(d: SetupDraft): SetupEmployee[] {
  const hours = neededHours(d);
  const maxDays = 7 - d.rules.restDaysPerWeek;
  // Créneaux qu'une personne peut tenir dans la semaine : un par jour travaillé,
  // plus les coupures autorisées.
  const extra = d.rules.splitShifts === "never" ? 0 : d.rules.splitShifts === "limited" ? d.rules.maxSplitsPerWeek : maxDays * (Math.max(1, d.services.length) - 1);
  const out: SetupEmployee[] = [];
  const person = (postId: string, contractHours: number) => {
    const i = out.length;
    out.push({ id: sid("e"), firstName: FIRST[i % FIRST.length], lastName: LAST[(i * 7) % LAST.length], postId, contractHours });
  };

  for (const p of activePosts(d)) {
    // Nombre de créneaux à tenir dans la semaine et durée moyenne d'un créneau
    let units = 0;
    for (let day = 0; day < 7; day++)
      for (const sv of d.services) {
        if (!serviceActive(sv, day)) continue;
        const need = d.needs[`${sv.id}|${p.id}`];
        units += need ? (day >= 5 ? need.weekend : need.weekday) : 0;
      }
    if (!units) continue;
    const avg = hours[p.id] / units;
    // Ce qu'une personne peut faire au maximum, selon les jours de repos et les coupures
    // Contrat = un nombre entier de créneaux (jusqu'à 39 h), pour que les heures tombent juste
    const shiftsPerPerson = Math.max(1, Math.min(maxDays + extra, Math.floor(39 / avg), Math.floor((d.rules.maxHoursPerDay * maxDays) / avg)));
    const contract = Math.max(4, Math.round(shiftsPerPerson * avg * 2) / 2);
    const people = Math.max(1, Math.ceil(hours[p.id] / contract));
    for (let k = 0; k < people; k++) person(p.id, contract);
  }

  // Vérification : on ajoute du monde là où une semaine test reste incomplète
  for (let round = 0; round < 12; round++) {
    const state = stateFromDraft({ ...d, employees: out });
    const res = generateWeek(state);
    if (!res.unfilled) break;
    const missing = new Map<string, number>();
    for (const c of coverage(state, res.shifts)) if (c.assigned < c.needed) missing.set(c.postId, (missing.get(c.postId) ?? 0) + c.needed - c.assigned);
    if (!missing.size) break;
    for (const [postId] of missing) {
      const same = out.filter((e) => e.postId === postId);
      person(postId, same[0]?.contractHours ?? 24);
    }
  }
  return out;
}

/** Transforme les réponses en état complet de l'application. */
export function stateFromDraft(d: SetupDraft): AppState {
  const posts = activePosts(d).map(({ selected: _s, ...p }) => p); // eslint-disable-line @typescript-eslint/no-unused-vars
  const needs: AppState["needs"] = {};
  for (let day = 0; day < 7; day++)
    for (const sv of d.services) {
      if (!serviceActive(sv, day)) continue;
      for (const p of posts) {
        const need = d.needs[`${sv.id}|${p.id}`];
        const v = need ? (day >= 5 ? need.weekend : need.weekday) : 0;
        if (v) needs[needKey(day, sv.id, p.id)] = v;
      }
    }
  const employees: Employee[] = d.employees
    .filter((e) => e.firstName.trim())
    .map((e) => ({ id: e.id, firstName: e.firstName.trim(), lastName: e.lastName.trim(), postIds: posts.some((p) => p.id === e.postId) ? [e.postId] : [posts[0]?.id].filter(Boolean), contractHours: e.contractHours, unavailability: [], weekendHistory: 0 }));
  const nextWeek = addWeeks(mondayOf(new Date()), 1);
  return {
    version: STATE_VERSION,
    establishment: {
      name: d.name.trim() || activity(d.activity).label,
      type: d.activity,
      organisation: d.organisation,
      opening: d.opening,
      prepMinutes: d.prepMinutes,
      closeMinutes: d.closeMinutes,
    },
    rules: d.rules,
    posts,
    services: d.services,
    employees,
    needs,
    plans: { [nextWeek]: [] },
    templates: [],
    absences: [],
    currentWeek: nextWeek,
    shareToken: "e-" + Math.random().toString(36).slice(2, 10),
  };
}

export { ACTIVITIES };
