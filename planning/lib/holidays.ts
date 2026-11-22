// Jours fériés en France métropolitaine, calculés automatiquement
// (y compris Pâques, l'Ascension et la Pentecôte, qui changent chaque année).

import type { AppState, HolidayId } from "./types";
import { dateOfDay, toISODate } from "./time";

export type Holiday = { id: HolidayId; label: string; date: string };

/** Dimanche de Pâques (algorithme de Meeus / Jones / Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const plusDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function holidaysOfYear(year: number): Holiday[] {
  const easter = easterSunday(year);
  const fixed = (m: number, d: number) => toISODate(new Date(year, m - 1, d));
  return [
    { id: "jourdelan", label: "Jour de l'an", date: fixed(1, 1) },
    { id: "paques", label: "Lundi de Pâques", date: toISODate(plusDays(easter, 1)) },
    { id: "1mai", label: "Fête du Travail", date: fixed(5, 1) },
    { id: "8mai", label: "Victoire 1945", date: fixed(5, 8) },
    { id: "ascension", label: "Ascension", date: toISODate(plusDays(easter, 39)) },
    { id: "pentecote", label: "Lundi de Pentecôte", date: toISODate(plusDays(easter, 50)) },
    { id: "14juillet", label: "Fête nationale", date: fixed(7, 14) },
    { id: "15aout", label: "Assomption", date: fixed(8, 15) },
    { id: "toussaint", label: "Toussaint", date: fixed(11, 1) },
    { id: "11novembre", label: "Armistice 1918", date: fixed(11, 11) },
    { id: "noel", label: "Noël", date: fixed(12, 25) },
  ];
}

/** Jours fériés de la semaine : jour (0 = lundi) → férié. */
export function holidaysInWeek(week: string): Map<number, Holiday> {
  const out = new Map<number, Holiday>();
  for (let d = 0; d < 7; d++) {
    const date = dateOfDay(week, d);
    const iso = toISODate(date);
    const h = holidaysOfYear(date.getFullYear()).find((x) => x.date === iso);
    if (h) out.set(d, h);
  }
  return out;
}

export function isHolidayClosed(state: Pick<AppState, "establishment">, id: HolidayId) {
  return (state.establishment.closedHolidays ?? []).includes(id);
}
