// ============================================================================
// Module UNIQUE de vérification du planning.
//
// Utilisé par : le générateur (pour savoir s'il peut placer quelqu'un),
// les modifications à la main (aperçu dans la fenêtre d'édition) et le bandeau
// d'alertes. Ainsi, « Tout est en règle » n'apparaît que si TOUT passe.
//
// Deux niveaux :
//  - "error"   (rouge) : interdit — règle légale ou limite fixée par le gérant ;
//  - "warning" (ambre) : préférence non respectée ou point à vérifier.
//
// Ce sont des aides réglables, pas un conseil juridique : chaque établissement
// doit les adapter à sa convention collective.
// ============================================================================

import type { AppState, Employee, Rules, Shift } from "../types";
import { DAYS, addWeeks, formatHours } from "../time";
import { absRange, coverage, dayStats, isUnavailable, rulesOf, servicesOfShift, shiftHours } from "../rules";

export const LEGAL = {
  /** Durée maximale hebdomadaire absolue (Code du travail). */
  maxWeekHours: 48,
  /** Repos hebdomadaire : 24 h + 11 h de repos quotidien. */
  weeklyRestHours: 35,
  /** Pause obligatoire dès 6 h de travail dans la journée. */
  pauseAfterHours: 6,
  pauseMinutes: 20,
};

export type IssueKind =
  | "unavailable"
  | "overlap"
  | "dailyRest"
  | "weeklyRest"
  | "restDays"
  | "consecutiveRest"
  | "dayHours"
  | "weekHours"
  | "amplitude"
  | "split"
  | "pause"
  | "contractOver"
  | "overtime"
  | "contractUnder"
  | "offPost"
  | "weekend"
  | "uncovered";

export type Severity = "error" | "warning";

export type Issue = {
  id: string;
  kind: IssueKind;
  severity: Severity;
  title: string;
  detail: string;
  employeeId?: string;
  day?: number;
  shiftIds?: string[];
};

export const ISSUE_LABELS: Record<IssueKind, string> = {
  unavailable: "Indisponibilité",
  overlap: "Chevauchement",
  dailyRest: "Repos entre deux jours",
  weeklyRest: "Repos de 35 h",
  restDays: "Jours de repos",
  consecutiveRest: "Repos à la suite",
  dayHours: "Journée trop longue",
  weekHours: "48 h par semaine",
  amplitude: "Amplitude",
  split: "Coupure",
  pause: "Pause de 20 min",
  contractOver: "Heures dépassées",
  overtime: "Heures sup",
  contractUnder: "Sous le contrat",
  offPost: "Hors poste",
  weekend: "Week-ends",
  uncovered: "Poste non couvert",
};

/** Règles « interdites » : le générateur ne les enfreint jamais. */
export const HARD_KINDS = new Set<IssueKind>([
  "unavailable",
  "overlap",
  "dailyRest",
  "weeklyRest",
  "restDays",
  "dayHours",
  "weekHours",
  "amplitude",
  "split",
  "pause",
  "contractOver",
]);

type ShiftLike = Pick<Shift, "id" | "day" | "start" | "end" | "postId" | "breakMinutes">;

const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? "s" : ""}`;

/**
 * Vérifie le planning d'UNE personne sur la semaine.
 * `prev` = ses créneaux de la semaine précédente (pour le repos dimanche → lundi).
 * `hardOnly` = ne calcule que les règles interdites (plus rapide, pour le générateur).
 */
export function checkEmployee(
  state: Pick<AppState, "rules" | "services">,
  e: Employee,
  shifts: ShiftLike[],
  opts: { prev?: ShiftLike[]; hardOnly?: boolean } = {},
): Issue[] {
  const rules: Rules = rulesOf(state);
  const out: Issue[] = [];
  const name = e.firstName;
  const add = (i: Omit<Issue, "employeeId">) => out.push({ ...i, employeeId: e.id });
  const mine = [...shifts].sort((a, b) => absRange(a)[0] - absRange(b)[0]);
  const total = mine.reduce((a, s) => a + shiftHours(s), 0);

  // --- Heures de la semaine -------------------------------------------------
  if (mine.length) {
    if (total > e.contractHours + rules.overtimeHours + 0.01) {
      add({
        id: `contractOver-${e.id}`,
        kind: "contractOver",
        severity: "error",
        title: `${name} dépasse ses heures`,
        detail: `${formatHours(total)} planifiées pour ${formatHours(e.contractHours)} au contrat${rules.overtimeHours ? ` (+${rules.overtimeHours} h autorisées)` : ""}.`,
      });
    } else if (!opts.hardOnly && total > e.contractHours + 0.01) {
      add({ id: `overtime-${e.id}`, kind: "overtime", severity: "warning", title: `${name} fait ${formatHours(total - e.contractHours)} sup`, detail: `${formatHours(total)} planifiées pour ${formatHours(e.contractHours)} au contrat (dans la limite autorisée).` });
    }
    if (total > LEGAL.maxWeekHours + 0.01) {
      add({ id: `week48-${e.id}`, kind: "weekHours", severity: "error", title: `${name} : ${formatHours(total)} dans la semaine`, detail: `Maximum légal : ${LEGAL.maxWeekHours} h par semaine.` });
    }
  }
  if (!opts.hardOnly && e.contractHours > 0 && total < e.contractHours - 0.5) {
    add({
      id: `contractUnder-${e.id}`,
      kind: "contractUnder",
      severity: "warning",
      title: `${name} : ${formatHours(e.contractHours - total)} non planifiées`,
      detail: `${formatHours(total)} planifiées pour ${formatHours(e.contractHours)} au contrat : ces heures sont payées.`,
    });
  }
  if (!mine.length) return out;

  // --- Jours de repos ---------------------------------------------------------
  const days = new Set(mine.map((s) => s.day));
  const off = [0, 1, 2, 3, 4, 5, 6].filter((d) => !days.has(d));
  if (off.length < rules.restDaysPerWeek) {
    add({ id: `restDays-${e.id}`, kind: "restDays", severity: "error", title: `${name} n'a que ${plural(off.length, "jour")} de repos`, detail: `${days.size} jours travaillés : il faut ${plural(rules.restDaysPerWeek, "jour")} de repos par semaine.` });
  } else if (!opts.hardOnly && rules.consecutiveRestDays && rules.restDaysPerWeek >= 2) {
    const together = off.some((d) => off.includes((d + 1) % 7));
    if (!together) {
      add({
        id: `consecutive-${e.id}`,
        kind: "consecutiveRest",
        severity: "warning",
        title: `${name} : repos pas à la suite`,
        detail: `Repos ${off.map((d) => DAYS[d].toLowerCase()).join(" et ")} : vous avez demandé des jours de repos à la suite.`,
        day: off[0],
      });
    }
  }

  // --- Chaque journée ---------------------------------------------------------
  let splits = 0;
  for (const d of [...days].sort()) {
    const list = mine.filter((s) => s.day === d);
    const ids = list.map((s) => s.id);
    const st = dayStats(list);
    if (st.hours > rules.maxHoursPerDay + 0.01) {
      add({ id: `dayHours-${e.id}-${d}`, kind: "dayHours", severity: "error", title: `${name} : journée de ${formatHours(st.hours)}`, detail: `${DAYS[d]} : maximum ${rules.maxHoursPerDay} h de travail par jour.`, day: d, shiftIds: ids });
    }
    if (st.split) {
      splits++;
      if (rules.splitShifts === "never") {
        add({ id: `split-${e.id}-${d}`, kind: "split", severity: "error", title: `${name} fait une coupure`, detail: `${DAYS[d]} : vous avez choisi de ne jamais faire de coupure.`, day: d, shiftIds: ids });
      }
      if (st.amplitude > rules.maxAmplitudeHours + 0.01) {
        add({ id: `amplitude-${e.id}-${d}`, kind: "amplitude", severity: "error", title: `${name} : amplitude de ${formatHours(st.amplitude)}`, detail: `${DAYS[d]} : du début à la fin de la journée, maximum ${rules.maxAmplitudeHours} h.`, day: d, shiftIds: ids });
      }
    }
    // Pause de 20 min dès 6 h de travail dans la journée
    if (st.hours >= LEGAL.pauseAfterHours - 1e-9) {
      const ranges = list.map(absRange).sort((a, b) => a[0] - b[0]);
      const gap = ranges.some((r, i) => i > 0 && r[0] - ranges[i - 1][1] >= LEGAL.pauseMinutes);
      const inShift = list.some((s) => (s.breakMinutes ?? 0) >= LEGAL.pauseMinutes);
      if (!gap && !inShift) {
        add({ id: `pause-${e.id}-${d}`, kind: "pause", severity: "error", title: `${name} : pas de pause`, detail: `${DAYS[d]} : ${formatHours(st.hours)} de travail sans pause. ${LEGAL.pauseMinutes} min minimum dès ${LEGAL.pauseAfterHours} h.`, day: d, shiftIds: ids });
      }
    }
  }
  if (rules.splitShifts === "limited" && splits > rules.maxSplitsPerWeek) {
    add({ id: `splits-${e.id}`, kind: "split", severity: "error", title: `${name} : ${splits} coupures`, detail: `Maximum ${plural(rules.maxSplitsPerWeek, "coupure")} par semaine.` });
  }

  // --- Chevauchements et repos entre deux journées ------------------------------
  const prevLast = (opts.prev ?? [])
    .map((s) => ({ s, r: absRange(s) }))
    .map(({ s, r }) => ({ s, r: [r[0] - 7 * 1440, r[1] - 7 * 1440] as [number, number] }))
    .sort((a, b) => b.r[1] - a.r[1])[0];
  const seq = mine.map((s) => ({ s, r: absRange(s) }));
  for (let i = 0; i < seq.length; i++) {
    const cur = seq[i];
    const before = i === 0 ? prevLast : seq[i - 1];
    if (!before) continue;
    if (cur.r[0] < before.r[1]) {
      add({ id: `overlap-${before.s.id}-${cur.s.id}`, kind: "overlap", severity: "error", title: `${name} a deux créneaux qui se chevauchent`, detail: `${DAYS[cur.s.day]} : les horaires se superposent.`, day: cur.s.day, shiftIds: [before.s.id, cur.s.id].filter((x) => mine.some((m) => m.id === x)) });
      continue;
    }
    const gap = (cur.r[0] - before.r[1]) / 60;
    const differentDay = i === 0 ? true : before.s.day !== cur.s.day;
    if (differentDay && gap < rules.minRestHours) {
      const from = i === 0 ? "dimanche (semaine précédente)" : DAYS[before.s.day].toLowerCase();
      add({ id: `dailyRest-${e.id}-${cur.s.id}`, kind: "dailyRest", severity: "error", title: `${name} n'a que ${formatHours(gap)} de repos`, detail: `Entre ${from} et ${DAYS[cur.s.day].toLowerCase()} : minimum ${rules.minRestHours} h.`, day: cur.s.day, shiftIds: i === 0 ? [cur.s.id] : [before.s.id, cur.s.id] });
    }
  }

  // --- Repos hebdomadaire de 35 h d'affilée ---------------------------------------
  const start = Math.max(0, prevLast?.r[1] ?? 0);
  let best = seq[0].r[0] - start;
  for (let i = 1; i < seq.length; i++) best = Math.max(best, seq[i].r[0] - seq[i - 1].r[1]);
  best = Math.max(best, 7 * 1440 - Math.max(...seq.map((x) => x.r[1])));
  if (best < LEGAL.weeklyRestHours * 60) {
    add({ id: `weeklyRest-${e.id}`, kind: "weeklyRest", severity: "error", title: `${name} n'a pas 35 h de repos d'affilée`, detail: `Plus long repos de la semaine : ${formatHours(best / 60)}. Il faut au moins ${LEGAL.weeklyRestHours} h consécutives.` });
  }

  // --- Disponibilités et postes ----------------------------------------------------
  for (const s of mine) {
    const touched = servicesOfShift(s, state.services);
    if (isUnavailable(e, s.day) || touched.some((sv) => isUnavailable(e, s.day, sv.id))) {
      add({ id: `unavailable-${s.id}`, kind: "unavailable", severity: "error", title: `${name} est indisponible`, detail: `${DAYS[s.day]}${touched.length ? " " + touched.map((t) => t.name.toLowerCase()).join(" / ") : ""} : un créneau est planifié sur une indisponibilité.`, day: s.day, shiftIds: [s.id] });
    }
    if (!opts.hardOnly && !e.postIds.includes(s.postId)) {
      add({ id: `offPost-${s.id}`, kind: "offPost", severity: "warning", title: `${name} hors de ses postes`, detail: `${DAYS[s.day]} : ce poste n'est pas dans sa fiche.`, day: s.day, shiftIds: [s.id] });
    }
  }

  // --- Équité des week-ends ------------------------------------------------------
  const weekendOnly = [0, 1, 2, 3, 4].filter((d) => isUnavailable(e, d)).length >= 4; // ex. étudiant du week-end
  if (!opts.hardOnly && rules.weekendFairness && !weekendOnly && (days.has(5) || days.has(6)) && e.weekendHistory >= 4) {
    add({ id: `weekend-${e.id}`, kind: "weekend", severity: "warning", title: `${name} : 5e week-end travaillé de suite`, detail: `A travaillé les 4 derniers week-ends. Pensez à lui en libérer un.`, day: days.has(5) ? 5 : 6 });
  }

  return out;
}

/** Vérifie toute la semaine : chaque personne, puis la couverture des besoins. */
export function checkWeek(state: AppState, shifts: Shift[], week = state.currentWeek): Issue[] {
  const prevWeek = state.plans?.[addWeeks(week, -1)] ?? [];
  const issues: Issue[] = [];
  for (const e of state.employees) {
    const mine = shifts.filter((s) => s.employeeId === e.id);
    const prev = prevWeek.filter((s) => s.employeeId === e.id && s.day === 6);
    issues.push(...checkEmployee(state, e, mine, { prev }));
  }
  const postName = (id: string) => state.posts.find((p) => p.id === id)?.name ?? "Poste";
  const svName = (id: string) => state.services.find((s) => s.id === id)?.name.toLowerCase() ?? "";
  for (const c of coverage(state, shifts)) {
    if (c.assigned < c.needed) {
      const missing = c.needed - c.assigned;
      issues.push({ id: `uncovered-${c.day}-${c.serviceId}-${c.postId}`, kind: "uncovered", severity: "warning", title: `${DAYS[c.day]} ${svName(c.serviceId)} : ${postName(c.postId)} non couvert`, detail: `Il manque ${plural(missing, "personne")} (${c.assigned}/${c.needed}).`, day: c.day });
    }
  }
  // Rouge d'abord, puis ambre
  return issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
}

// Noms gardés pour le reste de l'application
export type Alert = Issue;
export type AlertKind = IssueKind;
export const ALERT_LABELS = ISSUE_LABELS;
export const computeAlerts = checkWeek;
