// Génération automatique de la semaine.
//
// 1. Repos : si le gérant veut des jours de repos à la suite, on choisit d'abord
//    pour chacun deux jours collés, en évitant les jours où son poste est le plus
//    demandé et en étalant les repos dans l'équipe.
// 2. Remplissage (algorithme « glouton ») : on prend la place la plus difficile à
//    pourvoir (le moins de candidats), puis la meilleure personne selon un score
//    qui privilégie ceux qui sont le plus loin de leurs heures de contrat.
//    Une personne n'est candidate que si le module de vérification (engine/check)
//    ne trouve AUCUNE règle interdite après ajout du créneau.
// 3. Renforts : s'il reste des heures de contrat non planifiées, on propose où les
//    placer (services les plus chargés) au lieu de les ignorer.

import type { AppState, Employee, Service, Shift } from "./types";
import { absRange, getNeed, isUnavailable, rulesOf, serviceActive, shiftHours, svTime } from "./rules";
import { checkEmployee, type Issue } from "./engine/check";
import { DAYS, addWeeks } from "./time";

type Slot = { day: number; service: Service; postId: string; start: string; end: string; breakMinutes?: number };
type GenState = Pick<AppState, "employees" | "services" | "posts" | "needs" | "rules"> & Partial<Pick<AppState, "plans" | "currentWeek">>;

let counter = 0;
const newId = () => `g${Date.now().toString(36)}${(counter++).toString(36)}`;

export type GenerateResult = { shifts: Shift[]; unfilled: number; filled: number };

function slotsOf(state: GenState): Slot[] {
  const slots: Slot[] = [];
  for (let day = 0; day < 7; day++)
    for (const service of state.services) {
      if (!serviceActive(service, day)) continue;
      const t = svTime(service, day);
      for (const p of state.posts) {
        const n = getNeed(state.needs, day, service.id, p.id);
        for (let i = 0; i < n; i++) slots.push({ day, service, postId: p.id, start: t.start, end: t.end, breakMinutes: service.breakMinutes });
      }
    }
  return slots;
}

/** Créneaux de la semaine précédente (dimanche) pour vérifier le repos du lundi. */
function prevOf(state: GenState, e: Employee): Shift[] {
  if (!state.plans || !state.currentWeek) return [];
  return (state.plans[addWeeks(state.currentWeek, -1)] ?? []).filter((s) => s.employeeId === e.id && s.day === 6);
}

/** Les ids des problèmes « interdits » d'une personne. */
function hardIds(state: GenState, e: Employee, mine: Shift[]): Set<string> {
  return new Set(checkEmployee(state, e, mine, { prev: prevOf(state, e), hardOnly: true }).map((i) => i.id));
}

/** Choisit pour chacun deux jours de repos à la suite (si demandé). */
function planRestDays(state: GenState, slots: Slot[], seed: number): Map<string, Set<number>> {
  const rules = rulesOf(state);
  const rest = new Map<string, Set<number>>();
  if (!rules.consecutiveRestDays || rules.restDaysPerWeek < 2) return rest;

  const demand = (postId: string, d: number) => slots.filter((s) => s.postId === postId && s.day === d).length;
  const offCount = new Map<string, number>(); // "post|jour" -> nb de personnes déjà au repos
  const order = [...state.employees].sort((a, b) => {
    const ua = [0, 1, 2, 3, 4, 5, 6].filter((d) => isUnavailable(a, d)).length;
    const ub = [0, 1, 2, 3, 4, 5, 6].filter((d) => isUnavailable(b, d)).length;
    return ub - ua;
  });
  for (const e of order) {
    const post = e.postIds[0];
    // Personnes capables de tenir ce poste ce jour-là (indisponibilités déduites)
    const available = (x: number) => state.employees.filter((o) => o.postIds.includes(post) && !isUnavailable(o, x)).length;
    let best: [number, number] = [0, 1];
    let bestCost = Infinity;
    for (let d = 0; d < 7; d++) {
      const pair: [number, number] = [d, (d + 1) % 7];
      let cost = 0;
      for (const x of pair) {
        if (isUnavailable(e, x)) {
          cost -= 2; // jour déjà non travaillé : idéal pour le repos
          continue;
        }
        const already = offCount.get(`${post}|${x}`) ?? 0;
        // Coût = demande du jour rapportée aux personnes encore disponibles
        cost += (demand(post, x) + 0.5) / Math.max(0.5, available(x) - already);
        if (x >= 5 && rules.weekendFairness) cost -= e.weekendHistory * 0.8; // ceux qui ont beaucoup donné ont plus de chances d'avoir leur week-end
      }
      cost += (((d * 7 + seed * 13 + e.id.length) % 11) / 11) * 0.05; // départage
      if (cost < bestCost) {
        bestCost = cost;
        best = pair;
      }
    }
    rest.set(e.id, new Set(best));
    for (const x of best) offCount.set(`${post}|${x}`, (offCount.get(`${post}|${x}`) ?? 0) + 1);
  }
  return rest;
}

export function generateWeek(state: GenState, opts: { seed?: number } = {}): GenerateResult {
  const seed = opts.seed ?? 0;
  const rules = rulesOf(state);
  const slots = slotsOf(state);
  const total = slots.length;
  const restPlan = planRestDays(state, slots, seed);
  const shifts: Shift[] = [];

  const mineOf = (e: Employee) => shifts.filter((s) => s.employeeId === e.id);
  const hours = (e: Employee) => mineOf(e).reduce((a, s) => a + shiftHours(s), 0);
  const daysWorked = (e: Employee) => new Set(mineOf(e).map((s) => s.day));
  const weekendDays = (e: Employee) => [...daysWorked(e)].filter((d) => d >= 5).length;

  function candidate(e: Employee, slot: Slot): Shift {
    return { id: "candidat", employeeId: e.id, day: slot.day, start: slot.start, end: slot.end, postId: slot.postId, ...(slot.breakMinutes ? { breakMinutes: slot.breakMinutes } : {}) };
  }

  function canTake(e: Employee, slot: Slot, respectRest: boolean): boolean {
    if (!e.postIds.includes(slot.postId)) return false;
    if (respectRest && restPlan.get(e.id)?.has(slot.day)) return false;
    // Même personne deux fois sur le même créneau : non
    if (mineOf(e).some((s) => s.day === slot.day && s.start === slot.start && s.end === slot.end)) return false;
    return hardIds(state, e, [...mineOf(e), candidate(e, slot)]).size === 0;
  }

  function score(e: Employee, slot: Slot): number {
    let sc = 0;
    const days = daysWorked(e);
    // Priorité à ceux qui sont le plus loin de leurs heures de contrat
    sc += (hours(e) / Math.max(1, e.contractHours)) * 10;
    sc += e.postIds[0] === slot.postId ? 0 : 3;
    // Coupures fréquentes : on regroupe sur une même journée (libère des jours)
    if (days.has(slot.day)) sc += rules.splitShifts === "often" ? -2 : 1;
    if (rules.weekendFairness && slot.day >= 5) sc += (e.weekendHistory + weekendDays(e)) * 1.5;
    if (seed) sc += (((e.id.charCodeAt(e.id.length - 1) * 31 + slot.day * 7 + seed * 13) % 17) / 17) * 2;
    return sc;
  }

  // Deux passes : d'abord en respectant les repos prévus, puis (si une place reste
  // vide) en acceptant de travailler un jour de repos prévu.
  let remaining = [...slots];
  for (const respectRest of [true, false]) {
    const left: Slot[] = [];
    while (remaining.length) {
      let bestIdx = -1;
      let bestCandidates: Employee[] = [];
      for (let i = 0; i < remaining.length; i++) {
        const c = state.employees.filter((e) => canTake(e, remaining[i], respectRest));
        if (bestIdx === -1 || c.length < bestCandidates.length || (c.length === bestCandidates.length && remaining[i].day >= 5 && remaining[bestIdx].day < 5)) {
          bestIdx = i;
          bestCandidates = c;
        }
        if (c.length === 0) break;
      }
      const slot = remaining.splice(bestIdx, 1)[0];
      if (!bestCandidates.length) {
        left.push(slot);
        continue;
      }
      const chosen = bestCandidates.map((e) => ({ e, sc: score(e, slot) })).sort((a, b) => a.sc - b.sc)[0].e;
      shifts.push({ ...candidate(chosen, slot), id: newId() });
    }
    remaining = left;
  }

  // 3. Réparation : une place reste vide parce que les personnes capables sont
  // « pleines » ? On confie un de leurs créneaux à quelqu'un d'autre, puis on
  // place la personne libérée sur la place vide.
  const unresolved: Slot[] = [];
  for (const slot of remaining) {
    let done = false;
    for (const e of state.employees) {
      if (done || !e.postIds.includes(slot.postId)) continue;
      for (const s of mineOf(e)) {
        const others = state.employees.filter((o) => o.id !== e.id && o.postIds.includes(s.postId));
        const without = shifts.filter((x) => x.id !== s.id);
        // e peut-il prendre la place vide une fois libéré de s ?
        const eMine = without.filter((x) => x.employeeId === e.id);
        if (hardIds(state, e, [...eMine, candidate(e, slot)]).size) continue;
        const taker = others.find((o) => {
          const oMine = without.filter((x) => x.employeeId === o.id);
          return hardIds(state, o, [...oMine, { ...s, employeeId: o.id }]).size === 0;
        });
        if (!taker) continue;
        const i = shifts.findIndex((x) => x.id === s.id);
        shifts[i] = { ...s, employeeId: taker.id };
        shifts.push({ ...candidate(e, slot), id: newId() });
        done = true;
        break;
      }
    }
    if (!done) unresolved.push(slot);
  }
  remaining = unresolved;

  shifts.sort((a, b) => a.day - b.day || absRange(a)[0] - absRange(b)[0]);
  return { shifts, unfilled: remaining.length, filled: total - remaining.length };
}

// ---- Renforts ------------------------------------------------------------------

export type Reinforcement = {
  /** add = nouveau créneau ; extend = allonger un créneau existant (`replaces`). */
  kind: "add" | "extend";
  shift: Shift;
  replaces?: string;
  reason: string;
};

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMin = (m: number) => {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};
const fmtH = (h: number) => (Number.isInteger(h) ? `${h} h` : `${Math.floor(h)} h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}`);
const MIN_REINFORCEMENT_HOURS = 2;

/**
 * Propose où placer les heures de contrat non planifiées :
 *  1. des renforts sur les créneaux les plus chargés de ses postes (créneau entier,
 *     ou plus court centré sur le coup de feu s'il reste moins d'heures) ;
 *  2. pour un petit reste (moins de 2 h), allonger un de ses créneaux.
 * Jamais de règle interdite, jamais de nouvelle alerte de repos à la suite.
 */
export function suggestReinforcements(state: GenState, shifts: Shift[]): Reinforcement[] {
  const out: Reinforcement[] = [];
  let all = [...shifts];
  const mineOf = (e: Employee) => all.filter((s) => s.employeeId === e.id);
  const missingOf = (e: Employee) => e.contractHours - mineOf(e).reduce((a, s) => a + shiftHours(s), 0);
  const postName = (id: string) => state.posts.find((p) => p.id === id)?.name ?? "";

  /** Le changement est-il acceptable pour cette personne ? */
  function acceptable(e: Employee, next: Shift[]): boolean {
    const before = checkEmployee(state, e, mineOf(e), { prev: prevOf(state, e) });
    const after = checkEmployee(state, e, next, { prev: prevOf(state, e) });
    const hard = new Set(before.filter((i) => i.severity === "error").map((i) => i.id));
    if (after.some((i) => i.severity === "error" && !hard.has(i.id))) return false;
    const consecutive = before.some((i) => i.kind === "consecutiveRest");
    return consecutive || !after.some((i) => i.kind === "consecutiveRest");
  }

  const people = state.employees.filter((e) => missingOf(e) > 0.5).sort((a, b) => missingOf(b) - missingOf(a));

  for (const e of people) {
    // 1. Renforts
    for (let guard = 0; guard < 10; guard++) {
      const missing = missingOf(e);
      if (missing < MIN_REINFORCEMENT_HOURS) break;
      const options: { shift: Shift; weight: number; label: string }[] = [];
      for (let day = 0; day < 7; day++)
        for (const sv of state.services) {
          if (!serviceActive(sv, day)) continue;
          const t = svTime(sv, day);
          for (const postId of e.postIds) {
            const need = getNeed(state.needs, day, sv.id, postId);
            if (need === 0) continue; // ce poste ne travaille pas sur ce créneau
            const full: Shift = { id: newId(), employeeId: e.id, day, start: t.start, end: t.end, postId, extra: true, ...(sv.breakMinutes ? { breakMinutes: sv.breakMinutes } : {}) };
            let shift = full;
            if (shiftHours(full) > missing + 0.01) {
              // Plus court, centré sur le milieu du service (le coup de feu)
              const dur = Math.floor(missing * 2) / 2;
              const s0 = toMin(t.start);
              let len = toMin(t.end) - s0;
              if (len <= 0) len += 1440;
              const start = s0 + Math.round((len - dur * 60) / 2 / 30) * 30;
              shift = { id: newId(), employeeId: e.id, day, start: fromMin(start), end: fromMin(start + dur * 60), postId, extra: true };
            }
            options.push({ shift, weight: need + (day >= 4 ? 0.5 : 0) + (postId === e.postIds[0] ? 0.3 : 0) + shiftHours(shift) / 100, label: `${DAYS[day]} ${sv.name.toLowerCase()} · ${postName(postId)}` });
          }
        }
      options.sort((a, b) => b.weight - a.weight);
      const pick = options.find((o) => {
        const mine = mineOf(e);
        if (mine.some((s) => s.day === o.shift.day && absRange(s)[0] < absRange(o.shift)[1] && absRange(o.shift)[0] < absRange(s)[1])) return false;
        return acceptable(e, [...mine, o.shift]);
      });
      if (!pick) break;
      all.push(pick.shift);
      out.push({ kind: "add", shift: pick.shift, reason: `Renfort ${pick.label} (${fmtH(shiftHours(pick.shift))})` });
    }

    // 2. Petit reste : allonger un créneau (arriver plus tôt ou partir plus tard)
    const rest = Math.floor(missingOf(e) * 2) / 2;
    if (rest >= 0.5 && rest < MIN_REINFORCEMENT_HOURS) {
      const mine = [...mineOf(e)].sort((a, b) => getNeed(state.needs, b.day, "", b.postId) - getNeed(state.needs, a.day, "", a.postId));
      for (const s of mine) {
        let done = false;
        for (const way of ["earlier", "later"] as const) {
          const ext: Shift =
            way === "earlier" ? { ...s, start: fromMin(toMin(s.start) - rest * 60) } : { ...s, end: fromMin(toMin(s.end) + rest * 60) };
          if (Math.abs(shiftHours(ext) - shiftHours(s) - rest) > 0.01) continue;
          const next = mineOf(e).map((x) => (x.id === s.id ? ext : x));
          if (!acceptable(e, next)) continue;
          all = all.map((x) => (x.id === s.id ? ext : x));
          out.push({
            kind: "extend",
            shift: ext,
            replaces: s.id,
            reason: `${way === "earlier" ? "Arriver" : "Partir"} ${fmtH(rest)} plus ${way === "earlier" ? "tôt" : "tard"} ${DAYS[s.day].toLowerCase()} (${way === "earlier" ? "mise en place" : "rangement"})`,
          });
          done = true;
          break;
        }
        if (done) break;
      }
    }
  }
  return out;
}

/** Applique les renforts proposés à une liste de créneaux. */
export function applyReinforcements(shifts: Shift[], list: Reinforcement[]): Shift[] {
  let out = [...shifts];
  for (const r of list) {
    if (r.kind === "extend" && r.replaces) out = out.map((s) => (s.id === r.replaces ? { ...r.shift, id: s.id } : s));
    else out.push(r.shift);
  }
  return out;
}

export type { Issue };
