// Petits outils pour manipuler les heures ("11:30") et les semaines.

export const DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];
export const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const DAYS_LETTER = ["L", "M", "M", "J", "V", "S", "D"];

/** "11:30" -> 690 minutes */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Début et fin en minutes ; une fin avant le début passe au lendemain. */
export function range(start: string, end: string): [number, number] {
  const s = toMinutes(start);
  let e = toMinutes(end);
  if (e <= s) e += 24 * 60;
  return [s, e];
}

/** Durée en heures (décimales) */
export function durationHours(start: string, end: string): number {
  const [s, e] = range(start, end);
  return (e - s) / 60;
}

export function overlapMinutes(
  a: [number, number],
  b: [number, number],
): number {
  return Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
}

/** 7.5 -> "7 h 30", 35 -> "35 h" */
export function formatHours(h: number): string {
  const sign = h < 0 ? "-" : "";
  const abs = Math.abs(h);
  const whole = Math.floor(abs + 1e-9);
  const min = Math.round((abs - whole) * 60);
  if (min === 0) return `${sign}${whole} h`;
  return `${sign}${whole} h ${String(min).padStart(2, "0")}`;
}

/** "11:00" -> "11h", "11:30" -> "11h30" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

// ---- Semaines -------------------------------------------------------------

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function mondayOf(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (copy.getDay() + 6) % 7; // 0 = lundi
  copy.setDate(copy.getDate() - day);
  return toISODate(copy);
}

export function addWeeks(week: string, n: number): string {
  const d = parseISODate(week);
  d.setDate(d.getDate() + n * 7);
  return toISODate(d);
}

export function dateOfDay(week: string, day: number): Date {
  const d = parseISODate(week);
  d.setDate(d.getDate() + day);
  return d;
}

const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/** "16 – 22 nov. 2026" */
export function formatWeekRange(week: string): string {
  const a = dateOfDay(week, 0);
  const b = dateOfDay(week, 6);
  if (a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  }
  return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
}

export function formatDayDate(week: string, day: number): string {
  const d = dateOfDay(week, day);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Numéro de semaine ISO */
export function isoWeekNumber(week: string): number {
  const d = parseISODate(week);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  return 1 + Math.round((diff - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}
