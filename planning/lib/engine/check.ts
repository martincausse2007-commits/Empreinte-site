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

import type { AbsenceType, AppState, Employee, Rules, Shift } from "../types";
import { ABSENCE_TYPES, absencesForWeek, expectedHours } from "../absences";
import { forWeek } from "../week";
import { DAYS, addWeeks, dateOfDay, formatHours, formatTime, toMinutes } from "../time";
import { diffWeek } from "../publish";
import { holidaysInWeek, isHolidayClosed } from "../holidays";
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
  | "uncovered"
  | "absence"
  | "notice";

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
  absence: "Absence",
  notice: "Délai de prévenance",
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
  "absence",
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
  opts: { prev?: ShiftLike[]; hardOnly?: boolean; absent?: Map<number, AbsenceType> } = {},
): Issue[] {
  const rules: Rules = rulesOf(state);
  const out: Issue[] = [];
  const name = e.firstName;
  const add = (i: Omit<Issue, "employeeId">) => out.push({ ...i, employeeId: e.id });
  const mine = [...shifts].sort((a, b) => absRange(a)[0] - absRange(b)[0]);
  const total = mine.reduce((a, s) => a + shiftHours(s), 0);
  // Heures à planifier : le contrat, moins les jours d'absence décomptés (congés, arrêt…)
  const target = expectedHours(e, opts.absent, rules);
  const targetLabel = target < e.contractHours - 0.01 ? `${formatHours(target)} à planifier (contrat ${formatHours(e.contractHours)}, absences déduites)` : `${formatHours(e.contractHours)} au contrat`;

  // --- Heures de la semaine -------------------------------------------------
  if (mine.length) {
    if (total > target + rules.overtimeHours + 0.01) {
      add({
        id: `contractOver-${e.id}`,
        kind: "contractOver",
        severity: "error",
        title: `${name} dépasse ses heures`,
        detail: `${formatHours(total)} planifiées pour ${targetLabel}${rules.overtimeHours ? ` (+${rules.overtimeHours} h autorisées)` : ""}.`,
      });
    } else if (!opts.hardOnly && total > target + 0.01) {
      add({ id: `overtime-${e.id}`, kind: "overtime", severity: "warning", title: `${name} fait ${formatHours(total - target)} sup`, detail: `${formatHours(total)} planifiées pour ${targetLabel} (dans la limite autorisée).` });
    }
    if (total > LEGAL.maxWeekHours + 0.01) {
      add({ id: `week48-${e.id}`, kind: "weekHours", severity: "error", title: `${name} : ${formatHours(total)} dans la semaine`, detail: `Maximum légal : ${LEGAL.maxWeekHours} h par semaine.` });
    }
  }
  if (!opts.hardOnly && target > 0 && total < target - 0.5) {
    add({
      id: `contractUnder-${e.id}`,
      kind: "contractUnder",
      severity: "warning",
      title: `${name} : ${formatHours(target - total)} non planifiées`,
      detail: `${formatHours(total)} planifiées pour ${targetLabel} : ces heures sont payées.`,
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
    const away = opts.absent?.get(s.day);
    if (away) {
      add({ id: `absence-${s.id}`, kind: "absence", severity: "error", title: `${name} est absent·e (${ABSENCE_TYPES[away].label.toLowerCase()})`, detail: `${DAYS[s.day]} : un créneau est planifié pendant une absence.`, day: s.day, shiftIds: [s.id] });
    }
    // Plages autorisées (ex. étudiant : pas avant 17 h en semaine)
    for (const w of e.prefs?.timeWindows ?? []) {
      if (!w.days.includes(s.day)) continue;
      const [a, b] = absRange({ ...s, day: 0 });
      const tooEarly = w.from && a < toMinutes(w.from);
      const tooLate = w.to && b > (toMinutes(w.to) <= toMinutes(w.from ?? "00:00") ? toMinutes(w.to) + 1440 : toMinutes(w.to));
      if (tooEarly || tooLate) {
        const rule = w.from && w.to ? `entre ${formatTime(w.from)} et ${formatTime(w.to)}` : w.from ? `à partir de ${formatTime(w.from)}` : `jusqu'à ${formatTime(w.to!)}`;
        add({ id: `window-${s.id}`, kind: "unavailable", severity: "error", title: `${name} n'est pas disponible à ces horaires`, detail: `${DAYS[s.day]} : disponible seulement ${rule}${w.label ? ` (${w.label})` : ""}.`, day: s.day, shiftIds: [s.id] });
      }
    }
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
/** Jours ouvrés de l'établissement (jours d'ouverture, hors fériés fermés) strictement entre deux dates. */
export function openDaysBetween(state: Pick<AppState, "establishment">, from: Date, to: Date): number {
  let n = 0;
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  for (; d < end; d.setDate(d.getDate() + 1)) {
    const day = (d.getDay() + 6) % 7;
    const opening = state.establishment.opening ?? [];
    const open = opening.length ? (opening[day]?.length ?? 0) > 0 : day < 6;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    const iso = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    const h = holidaysInWeek(iso).get(day);
    if (open && !(h && isHolidayClosed(state, h.id))) n++;
  }
  return n;
}

/**
 * Délai de prévenance : un planning déjà publié est modifié trop près de la date.
 * Temps partiel : jours ouvrés (Code du travail : 7, un accord peut descendre à 3).
 * Temps plein : jours calendaires, valeur choisie par l'établissement.
 * Toujours en « à vérifier » : des circonstances exceptionnelles peuvent le permettre.
 */
export function noticeIssues(state: AppState, week: string, shifts: Shift[], today: Date): Issue[] {
  const meta = state.weekMeta?.[week];
  if (!meta || meta.status !== "published" || !meta.snapshot) return [];
  const rules = rulesOf(state);
  const out: Issue[] = [];
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (const c of diffWeek(meta.snapshot, shifts)) {
    const e = state.employees.find((x) => x.id === c.employeeId);
    if (!e) continue;
    const date = dateOfDay(week, c.day);
    if (date < now) continue; // jour déjà passé
    const partTime = e.contractHours < 35;
    const need = partTime ? rules.noticePartTimeDays ?? 7 : rules.noticeFullTimeDays ?? 7;
    const have = partTime ? openDaysBetween(state, now, date) : Math.round((date.getTime() - now.getTime()) / 86400000);
    if (have >= need) continue;
    out.push({
      id: `notice-${e.id}-${c.day}`,
      kind: "notice",
      severity: "warning",
      title: `${e.firstName} : changement trop tardif`,
      detail: `${DAYS[c.day]} changé après publication (${c.after === "repos" ? "repos" : c.after}, avant : ${c.before}) : ${have} jour${have > 1 ? "s" : ""}${partTime ? " ouvré" + (have > 1 ? "s" : "") : ""} avant, pour ${need} demandé${need > 1 ? "s" : ""} (${partTime ? "temps partiel" : "temps plein"}). Possible seulement dans les cas prévus par votre convention : à vérifier avec votre comptable.`,
      employeeId: e.id,
      day: c.day,
      shiftIds: shifts.filter((s) => s.employeeId === e.id && s.day === c.day).map((s) => s.id),
    });
  }
  return out;
}

export function checkWeek(state0: AppState, shifts: Shift[], week = state0.currentWeek, opts: { today?: Date } = {}): Issue[] {
  const state = forWeek(state0, week); // jours fériés fermés : rien à couvrir
  const prevWeek = state.plans?.[addWeeks(week, -1)] ?? [];
  const absences = absencesForWeek(state, week);
  const issues: Issue[] = [];
  for (const e of state.employees) {
    const mine = shifts.filter((s) => s.employeeId === e.id);
    if (e.archived) continue; // salarié supprimé : historique anonymisé, plus vérifié
    const prev = prevWeek.filter((s) => s.employeeId === e.id && s.day === 6);
    issues.push(...checkEmployee(state, e, mine, { prev, absent: absences.get(e.id) }));
  }
  const postName = (id: string) => state.posts.find((p) => p.id === id)?.name ?? "Poste";
  const svName = (id: string) => state.services.find((s) => s.id === id)?.name.toLowerCase() ?? "";
  for (const c of coverage(state, shifts)) {
    if (c.assigned < c.needed) {
      const missing = c.needed - c.assigned;
      issues.push({ id: `uncovered-${c.day}-${c.serviceId}-${c.postId}`, kind: "uncovered", severity: "warning", title: `${DAYS[c.day]} ${svName(c.serviceId)} : ${postName(c.postId)} non couvert`, detail: `Il manque ${plural(missing, "personne")} (${c.assigned}/${c.needed}).`, day: c.day });
    }
  }
  issues.push(...noticeIssues(state0, week, shifts, opts.today ?? new Date()));
  // Rouge d'abord, puis ambre
  return issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1));
}

// Noms gardés pour le reste de l'application
export type Alert = Issue;
export type AlertKind = IssueKind;
export const ALERT_LABELS = ISSUE_LABELS;
export const computeAlerts = checkWeek;
