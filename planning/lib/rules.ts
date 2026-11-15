// Règles du planning : calcul des heures, de la couverture et des alertes.
// Ce fichier est utilisé à la fois par l'affichage et par la génération.

import type { AppState, Employee, Needs, Service, Shift } from "./types";
import { DAYS, durationHours, formatHours, overlapMinutes, range } from "./time";

export const MIN_REST_HOURS = 11;
export const MAX_WORKED_DAYS = 5; // = 2 jours de repos par semaine

export function needKey(day: number, serviceId: string, postId: string) {
  return `${day}|${serviceId}|${postId}`;
}

export function getNeed(needs: Needs, day: number, serviceId: string, postId: string) {
  return needs[needKey(day, serviceId, postId)] ?? 0;
}

export function shiftHours(s: Pick<Shift, "start" | "end">) {
  return durationHours(s.start, s.end);
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

/** Un shift "couvre" un service s'il en recouvre au moins la moitié. */
export function shiftCoversService(s: Pick<Shift, "start" | "end">, service: Service) {
  const sr = range(service.start, service.end);
  return overlapMinutes(range(s.start, s.end), sr) >= (sr[1] - sr[0]) / 2;
}

export function isUnavailable(e: Employee, day: number, serviceId?: string) {
  return e.unavailability.some(
    (u) => u.day === day && (u.serviceId === "all" || u.serviceId === serviceId),
  );
}

/** Services du jour que le shift touche (pour vérifier les indisponibilités). */
export function servicesOfShift(s: Pick<Shift, "start" | "end">, services: Service[]) {
  return services.filter((sv) => overlapMinutes(range(s.start, s.end), range(sv.start, sv.end)) > 0);
}

export type Coverage = {
  day: number;
  serviceId: string;
  postId: string;
  needed: number;
  assigned: number;
};

export function coverage(state: Pick<AppState, "needs" | "services" | "posts">, shifts: Shift[]): Coverage[] {
  const out: Coverage[] = [];
  for (let day = 0; day < 7; day++) {
    for (const sv of state.services) {
      for (const p of state.posts) {
        const needed = getNeed(state.needs, day, sv.id, p.id);
        const assigned = shifts.filter(
          (s) => s.day === day && s.postId === p.id && shiftCoversService(s, sv),
        ).length;
        if (needed > 0 || assigned > 0) out.push({ day, serviceId: sv.id, postId: p.id, needed, assigned });
      }
    }
  }
  return out;
}

export type AlertKind = "hours" | "rest" | "restDays" | "unavailable" | "overlap" | "uncovered";

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
  rest: "Repos de 11 h",
  restDays: "2 jours de repos",
  unavailable: "Indisponibilité",
  overlap: "Chevauchement",
  uncovered: "Poste non couvert",
};

export function computeAlerts(state: AppState, shifts: Shift[]): Alert[] {
  const alerts: Alert[] = [];
  const postName = (id: string) => state.posts.find((p) => p.id === id)?.name ?? "Poste";
  const svName = (id: string) => state.services.find((s) => s.id === id)?.name.toLowerCase() ?? "";

  for (const e of state.employees) {
    const mine = shifts.filter((s) => s.employeeId === e.id).sort((a, b) => absRange(a)[0] - absRange(b)[0]);
    if (mine.length === 0) continue;
    const name = e.firstName;

    // Heures du contrat
    const total = mine.reduce((acc, s) => acc + shiftHours(s), 0);
    if (total > e.contractHours + 0.01) {
      alerts.push({
        id: `hours-${e.id}`,
        kind: "hours",
        severity: "error",
        title: `${name} dépasse son contrat`,
        detail: `${formatHours(total)} planifiées pour ${formatHours(e.contractHours)} au contrat (+${formatHours(total - e.contractHours)}).`,
        employeeId: e.id,
      });
    }

    // Jours de repos
    const days = new Set(mine.map((s) => s.day));
    if (days.size > MAX_WORKED_DAYS) {
      alerts.push({
        id: `restdays-${e.id}`,
        kind: "restDays",
        severity: "error",
        title: `${name} n'a pas 2 jours de repos`,
        detail: `${days.size} jours travaillés cette semaine (maximum ${MAX_WORKED_DAYS}).`,
        employeeId: e.id,
      });
    }

    // Chevauchements et repos de 11 h entre deux journées
    for (let i = 0; i < mine.length - 1; i++) {
      const a = mine[i];
      const b = mine[i + 1];
      const ra = absRange(a);
      const rb = absRange(b);
      if (rb[0] < ra[1]) {
        alerts.push({
          id: `overlap-${a.id}-${b.id}`,
          kind: "overlap",
          severity: "error",
          title: `${name} a deux créneaux qui se chevauchent`,
          detail: `${DAYS[a.day]} : les horaires se superposent.`,
          employeeId: e.id,
          day: a.day,
          shiftIds: [a.id, b.id],
        });
        continue;
      }
      // Le repos journalier ne s'applique qu'entre deux journées différentes
      // (une coupure midi/soir le même jour est autorisée).
      const sameWorkday = a.day === b.day;
      const gap = (rb[0] - ra[1]) / 60;
      if (!sameWorkday && gap < MIN_REST_HOURS) {
        alerts.push({
          id: `rest-${a.id}-${b.id}`,
          kind: "rest",
          severity: "error",
          title: `${name} n'a que ${formatHours(gap)} de repos`,
          detail: `Entre ${DAYS[a.day].toLowerCase()} et ${DAYS[b.day].toLowerCase()} (minimum ${MIN_REST_HOURS} h).`,
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
        alerts.push({
          id: `unavail-${s.id}`,
          kind: "unavailable",
          severity: "error",
          title: `${name} est indisponible`,
          detail: `${DAYS[s.day]} ${touched.map((t) => t.name.toLowerCase()).join(" / ")} : un créneau est planifié sur une indisponibilité.`,
          employeeId: e.id,
          day: s.day,
          shiftIds: [s.id],
        });
      }
    }
  }

  // Postes non couverts
  for (const c of coverage(state, shifts)) {
    if (c.assigned < c.needed) {
      const missing = c.needed - c.assigned;
      alerts.push({
        id: `uncovered-${c.day}-${c.serviceId}-${c.postId}`,
        kind: "uncovered",
        severity: "warning",
        title: `${DAYS[c.day]} ${svName(c.serviceId)} : ${postName(c.postId)} non couvert`,
        detail: `Il manque ${missing} personne${missing > 1 ? "s" : ""} (${c.assigned}/${c.needed}).`,
        day: c.day,
      });
    }
  }

  return alerts;
}
