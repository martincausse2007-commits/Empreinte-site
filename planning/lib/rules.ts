// Règles du planning : calcul des heures, de la couverture et des alertes.
// Ce fichier est utilisé à la fois par l'affichage et par la génération.
// Les limites (repos, coupures, heures par jour…) viennent des réglages du gérant.

import type { AppState, Employee, Needs, Rules, Service, Shift, TimeRange } from "./types";
import { durationHours, overlapMinutes, range } from "./time";
import { DEFAULT_RULES } from "./presets";

export function needKey(day: number, serviceId: string, postId: string) {
  return `${day}|${serviceId}|${postId}`;
}

export function getNeed(needs: Needs, day: number, serviceId: string, postId: string) {
  return needs[needKey(day, serviceId, postId)] ?? 0;
}

/** Le créneau type existe-t-il ce jour-là ? */
export function serviceActive(sv: Service, day: number) {
  return !sv.days || sv.days.includes(day);
}

/** Horaires d'un créneau type pour un jour donné. */
export function svTime(sv: Service, day: number): TimeRange {
  return sv.overrides?.[day] ?? { start: sv.start, end: sv.end };
}

/** Heures travaillées (pause déduite). */
export function shiftHours(s: Pick<Shift, "start" | "end" | "breakMinutes">) {
  return Math.max(0, durationHours(s.start, s.end) - (s.breakMinutes ?? 0) / 60);
}

export function hoursByEmployee(shifts: Shift[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of shifts) out[s.employeeId] = (out[s.employeeId] ?? 0) + shiftHours(s);
  return out;
}

/** Position absolue d'un shift dans la semaine, en minutes depuis lundi 0h. */
export function absRange(s: Pick<Shift, "day" | "start" | "end">): [number, number] {
  const [a, b] = range(s.start, s.end);
  return [s.day * 1440 + a, s.day * 1440 + b];
}

/** Un shift "couvre" un créneau type s'il en recouvre au moins la moitié. */
export function shiftCoversService(s: Pick<Shift, "start" | "end" | "day">, service: Service) {
  if (!serviceActive(service, s.day)) return false;
  const t = svTime(service, s.day);
  const sr = range(t.start, t.end);
  return overlapMinutes(range(s.start, s.end), sr) >= (sr[1] - sr[0]) / 2;
}

export function isUnavailable(e: Employee, day: number, serviceId?: string) {
  return e.unavailability.some((u) => u.day === day && (u.serviceId === "all" || u.serviceId === serviceId));
}

/** Créneaux types que le shift touche (pour vérifier les indisponibilités). */
export function servicesOfShift(s: Pick<Shift, "start" | "end" | "day">, services: Service[]) {
  return services.filter((sv) => {
    if (!serviceActive(sv, s.day)) return false;
    const t = svTime(sv, s.day);
    return overlapMinutes(range(s.start, s.end), range(t.start, t.end)) > 0;
  });
}

export const rulesOf = (state: Pick<AppState, "rules">): Rules => ({ ...DEFAULT_RULES, ...(state.rules ?? {}) });

/** Infos sur une journée de travail : heures, amplitude, coupure. */
export function dayStats(shifts: Pick<Shift, "day" | "start" | "end" | "breakMinutes">[]) {
  if (!shifts.length) return { hours: 0, amplitude: 0, split: false };
  const rs = shifts.map(absRange).sort((a, b) => a[0] - b[0]);
  let split = false;
  for (let i = 1; i < rs.length; i++) if (rs[i][0] > rs[i - 1][1]) split = true;
  return {
    hours: shifts.reduce((a, s) => a + shiftHours(s), 0),
    amplitude: (Math.max(...rs.map((x) => x[1])) - rs[0][0]) / 60,
    split,
  };
}

export type Coverage = { day: number; serviceId: string; postId: string; needed: number; assigned: number };

export function coverage(state: Pick<AppState, "needs" | "services" | "posts">, shifts: Shift[]): Coverage[] {
  const out: Coverage[] = [];
  for (let day = 0; day < 7; day++) {
    for (const sv of state.services) {
      if (!serviceActive(sv, day)) continue;
      for (const p of state.posts) {
        const needed = getNeed(state.needs, day, sv.id, p.id);
        const assigned = shifts.filter((s) => s.day === day && s.postId === p.id && shiftCoversService(s, sv)).length;
        if (needed > 0 || assigned > 0) out.push({ day, serviceId: sv.id, postId: p.id, needed, assigned });
      }
    }
  }
  return out;
}
