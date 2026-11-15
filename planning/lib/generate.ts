// Génération automatique de la semaine.
//
// Principe (algorithme « glouton ») : on liste toutes les places à pourvoir
// (jour × créneau × poste). À chaque tour, on choisit la place la plus
// difficile à remplir (celle qui a le moins de candidats possibles), puis la
// meilleure personne pour cette place selon un score. On recommence jusqu'à ce
// que tout soit rempli ou qu'il n'y ait plus personne de disponible.
//
// Toutes les limites viennent des réglages du gérant (questionnaire) :
// heures du contrat, repos entre deux journées, jours de repos, coupures,
// heures maximum par jour, amplitude, équité des week-ends.

import type { AppState, Employee, Service, Shift } from "./types";
import { absRange, dayStats, getNeed, isUnavailable, rulesOf, serviceActive, shiftHours, svTime } from "./rules";

type Slot = { day: number; service: Service; postId: string; start: string; end: string; breakMinutes?: number };

let counter = 0;
const newId = () => `g${Date.now().toString(36)}${(counter++).toString(36)}`;

export type GenerateResult = { shifts: Shift[]; unfilled: number; filled: number };

export function generateWeek(
  state: Pick<AppState, "employees" | "services" | "posts" | "needs" | "rules">,
  opts: { seed?: number } = {},
): GenerateResult {
  const seed = opts.seed ?? 0;
  const rules = rulesOf(state);
  const maxDays = 7 - rules.restDaysPerWeek;
  const shifts: Shift[] = [];

  // 1. Toutes les places à pourvoir
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
  const total = slots.length;

  const mineOf = (e: Employee) => shifts.filter((s) => s.employeeId === e.id);
  const hours = (e: Employee) => mineOf(e).reduce((a, s) => a + shiftHours(s), 0);
  const daysWorked = (e: Employee) => new Set(mineOf(e).map((s) => s.day));
  const weekendDays = (e: Employee) => [...daysWorked(e)].filter((d) => d >= 5).length;
  const splitDays = (e: Employee) => [...daysWorked(e)].filter((d) => dayStats(mineOf(e).filter((s) => s.day === d)).split).length;

  function canTake(e: Employee, slot: Slot): boolean {
    if (!e.postIds.includes(slot.postId)) return false;
    if (isUnavailable(e, slot.day, slot.service.id)) return false;
    const candidate = { day: slot.day, start: slot.start, end: slot.end, breakMinutes: slot.breakMinutes };
    if (hours(e) + shiftHours(candidate) > e.contractHours + rules.overtimeHours + 0.01) return false;
    const days = daysWorked(e);
    if (!days.has(slot.day) && days.size >= maxDays) return false;
    const r = absRange(candidate);
    const sameDay: Pick<Shift, "day" | "start" | "end" | "breakMinutes">[] = [];
    for (const s of mineOf(e)) {
      const o = absRange(s);
      if (r[0] < o[1] && o[0] < r[1]) return false; // chevauchement
      if (s.day !== slot.day) {
        const gap = r[0] >= o[1] ? r[0] - o[1] : o[0] - r[1];
        if (gap < rules.minRestHours * 60) return false;
      } else sameDay.push(s);
    }
    if (sameDay.length) {
      const st = dayStats([...sameDay, candidate]);
      if (st.hours > rules.maxHoursPerDay + 0.01) return false;
      if (st.split) {
        if (rules.splitShifts === "never") return false;
        if (st.amplitude > rules.maxAmplitudeHours + 0.01) return false;
        if (rules.splitShifts === "limited" && !dayStats(sameDay).split && splitDays(e) >= rules.maxSplitsPerWeek) return false;
      }
    } else if (shiftHours(candidate) > rules.maxHoursPerDay + 0.01) return false;
    return true;
  }

  function score(e: Employee, slot: Slot): number {
    let sc = 0;
    const days = daysWorked(e);
    // Priorité à ceux qui sont le plus loin de leurs heures de contrat
    sc += (hours(e) / Math.max(1, e.contractHours)) * 10;
    // Poste principal plutôt que poste secondaire
    sc += e.postIds[0] === slot.postId ? 0 : 3;
    // Coupures fréquentes : on regroupe sur une même journée (plus de jours off)
    if (days.has(slot.day)) sc += rules.splitShifts === "often" ? -2 : 1;
    // Jours de repos consécutifs : on préfère travailler à côté d'un jour déjà travaillé
    if (rules.consecutiveRestDays && !days.has(slot.day) && days.size > 0) {
      const adjacent = days.has(slot.day - 1) || days.has(slot.day + 1);
      sc += adjacent ? -1.5 : 1.5;
    }
    // Équité des week-ends : pénalise ceux qui en ont déjà beaucoup fait
    if (rules.weekendFairness && slot.day >= 5) sc += (e.weekendHistory + weekendDays(e)) * 1.5;
    // Petite variation déterministe pour proposer d'autres versions
    if (seed) sc += (((e.id.charCodeAt(e.id.length - 1) * 31 + slot.day * 7 + seed * 13) % 17) / 17) * 2;
    return sc;
  }

  // 2. Remplissage
  const remaining = [...slots];
  let unfilled = 0;
  while (remaining.length) {
    let bestIdx = -1;
    let bestCandidates: Employee[] = [];
    for (let i = 0; i < remaining.length; i++) {
      const c = state.employees.filter((e) => canTake(e, remaining[i]));
      if (bestIdx === -1 || c.length < bestCandidates.length || (c.length === bestCandidates.length && remaining[i].day >= 5 && remaining[bestIdx].day < 5)) {
        bestIdx = i;
        bestCandidates = c;
      }
      if (c.length === 0) break;
    }
    const slot = remaining.splice(bestIdx, 1)[0];
    if (bestCandidates.length === 0) {
      unfilled++;
      continue;
    }
    const chosen = bestCandidates.map((e) => ({ e, sc: score(e, slot) })).sort((a, b) => a.sc - b.sc)[0].e;
    shifts.push({ id: newId(), employeeId: chosen.id, day: slot.day, start: slot.start, end: slot.end, postId: slot.postId, ...(slot.breakMinutes ? { breakMinutes: slot.breakMinutes } : {}) });
  }

  shifts.sort((a, b) => a.day - b.day || absRange(a)[0] - absRange(b)[0]);
  return { shifts, unfilled, filled: total - unfilled };
}
