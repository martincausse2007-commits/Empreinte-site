// Règles du planning : calcul des heures, de la couverture et des alertes.
// Ce fichier est utilisé à la fois par l'affichage et par la génération.
// Les limites (repos, coupures, heures par jour…) viennent des réglages du gérant.

import type { AppState, Employee, Needs, Rules, Service, Shift, TimeRange } from "./types";
import { DAYS, durationHours, formatHours, overlapMinutes, range } from "./time";
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

export type AlertKind = "hours" | "rest" | "restDays" | "unavailable" | "overlap" | "uncovered" | "dayLimit" | "split";

export type Alert = {
  id: string;
  kind: AlertKind;
  severity: "error" | "warning";
  title: string;
  detail: string;
  employeeId?: string;
  day?: number;
  shiftIds?: string[];
};

export const ALERT_LABELS: Record<AlertKind, string> = {
  hours: "Heures dépassées",
  rest: "Repos entre deux jours",
  restDays: "Jours de repos",
  unavailable: "Indisponibilité",
  overlap: "Chevauchement",
  uncovered: "Poste non couvert",
  dayLimit: "Journée trop longue",
  split: "Coupure",
};

export function computeAlerts(state: AppState, shifts: Shift[]): Alert[] {
  const rules = rulesOf(state);
  const alerts: Alert[] = [];
  const postName = (id: string) => state.posts.find((p) => p.id === id)?.name ?? "Poste";
  const svName = (id: string) => state.services.find((s) => s.id === id)?.name.toLowerCase() ?? "";
  const maxDays = 7 - rules.restDaysPerWeek;

  for (const e of state.employees) {
    const mine = shifts.filter((s) => s.employeeId === e.id).sort((a, b) => absRange(a)[0] - absRange(b)[0]);
    if (mine.length === 0) continue;
    const name = e.firstName;

    // Heures du contrat (+ heures supplémentaires autorisées)
    const total = mine.reduce((acc, s) => acc + shiftHours(s), 0);
    const limit = e.contractHours + rules.overtimeHours;
    if (total > limit + 0.01) {
      alerts.push({
        id: `hours-${e.id}`,
        kind: "hours",
        severity: "error",
        title: `${name} dépasse ses heures`,
        detail: `${formatHours(total)} planifiées pour ${formatHours(e.contractHours)} au contrat${rules.overtimeHours ? ` (+${rules.overtimeHours} h autorisées)` : ""}.`,
        employeeId: e.id,
      });
    }

    // Jours de repos
    const days = [...new Set(mine.map((s) => s.day))];
    if (days.length > maxDays) {
      alerts.push({
        id: `restdays-${e.id}`,
        kind: "restDays",
        severity: "error",
        title: `${name} n'a pas ${rules.restDaysPerWeek} jour${rules.restDaysPerWeek > 1 ? "s" : ""} de repos`,
        detail: `${days.length} jours travaillés cette semaine (maximum ${maxDays}).`,
        employeeId: e.id,
      });
    }

    // Limites par journée et coupures
    let splits = 0;
    for (const d of days) {
      const st = dayStats(mine.filter((s) => s.day === d));
      const ids = mine.filter((s) => s.day === d).map((s) => s.id);
      if (st.hours > rules.maxHoursPerDay + 0.01) {
        alerts.push({ id: `dayh-${e.id}-${d}`, kind: "dayLimit", severity: "error", title: `${name} : journée de ${formatHours(st.hours)}`, detail: `${DAYS[d]} : maximum ${rules.maxHoursPerDay} h par jour.`, employeeId: e.id, day: d, shiftIds: ids });
      } else if (st.split && st.amplitude > rules.maxAmplitudeHours + 0.01) {
        alerts.push({ id: `ampl-${e.id}-${d}`, kind: "dayLimit", severity: "error", title: `${name} : amplitude de ${formatHours(st.amplitude)}`, detail: `${DAYS[d]} : entre le début et la fin de journée, maximum ${rules.maxAmplitudeHours} h.`, employeeId: e.id, day: d, shiftIds: ids });
      }
      if (st.split) {
        splits++;
        if (rules.splitShifts === "never") {
          alerts.push({ id: `split-${e.id}-${d}`, kind: "split", severity: "error", title: `${name} fait une coupure`, detail: `${DAYS[d]} : vous avez choisi de ne pas faire de coupures.`, employeeId: e.id, day: d, shiftIds: ids });
        }
      }
    }
    if (rules.splitShifts === "limited" && splits > rules.maxSplitsPerWeek) {
      alerts.push({ id: `splits-${e.id}`, kind: "split", severity: "error", title: `${name} : ${splits} coupures`, detail: `Maximum ${rules.maxSplitsPerWeek} coupure${rules.maxSplitsPerWeek > 1 ? "s" : ""} par semaine.`, employeeId: e.id });
    }

    // Chevauchements et repos entre deux journées
    for (let i = 0; i < mine.length - 1; i++) {
      const a = mine[i];
      const b = mine[i + 1];
      const ra = absRange(a);
      const rb = absRange(b);
      if (rb[0] < ra[1]) {
        alerts.push({ id: `overlap-${a.id}-${b.id}`, kind: "overlap", severity: "error", title: `${name} a deux créneaux qui se chevauchent`, detail: `${DAYS[a.day]} : les horaires se superposent.`, employeeId: e.id, day: a.day, shiftIds: [a.id, b.id] });
        continue;
      }
      const gap = (rb[0] - ra[1]) / 60;
      if (a.day !== b.day && gap < rules.minRestHours) {
        alerts.push({
          id: `rest-${a.id}-${b.id}`,
          kind: "rest",
          severity: "error",
          title: `${name} n'a que ${formatHours(gap)} de repos`,
          detail: `Entre ${DAYS[a.day].toLowerCase()} et ${DAYS[b.day].toLowerCase()} (minimum ${rules.minRestHours} h).`,
          employeeId: e.id,
          day: b.day,
          shiftIds: [a.id, b.id],
        });
      }
    }

    // Indisponibilités
    for (const s of mine) {
      const touched = servicesOfShift(s, state.services);
      const hit = isUnavailable(e, s.day) || touched.some((sv) => isUnavailable(e, s.day, sv.id));
      if (hit) {
        alerts.push({ id: `unavail-${s.id}`, kind: "unavailable", severity: "error", title: `${name} est indisponible`, detail: `${DAYS[s.day]} ${touched.map((t) => t.name.toLowerCase()).join(" / ")} : un créneau est planifié sur une indisponibilité.`, employeeId: e.id, day: s.day, shiftIds: [s.id] });
      }
    }
  }

  // Postes non couverts
  for (const c of coverage(state, shifts)) {
    if (c.assigned < c.needed) {
      const missing = c.needed - c.assigned;
      alerts.push({ id: `uncovered-${c.day}-${c.serviceId}-${c.postId}`, kind: "uncovered", severity: "warning", title: `${DAYS[c.day]} ${svName(c.serviceId)} : ${postName(c.postId)} non couvert`, detail: `Il manque ${missing} personne${missing > 1 ? "s" : ""} (${c.assigned}/${c.needed}).`, day: c.day });
    }
  }

  return alerts;
}
