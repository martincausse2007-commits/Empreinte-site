// Réglages proposés par défaut selon le secteur d'activité, et construction
// automatique des créneaux types à partir des horaires d'ouverture.

import type { ActivityId, OpeningHours, Organisation, PostColor, Rules, Service, TimeRange } from "./types";
import { fromMinutes, toMinutes } from "./time";

export type PostPreset = { name: string; color: PostColor; weekday: number; weekend: number; selected: boolean };

export type ActivityPreset = {
  id: ActivityId;
  label: string;
  hint: string;
  posts: PostPreset[];
  opening: OpeningHours;
  organisation: Organisation;
  teams: number;
  prepMinutes: number;
  closeMinutes: number;
  rules: Partial<Rules>;
};

export const DEFAULT_RULES: Rules = {
  restDaysPerWeek: 2,
  consecutiveRestDays: true,
  minRestHours: 11,
  maxHoursPerDay: 10,
  maxAmplitudeHours: 13,
  splitShifts: "never",
  maxSplitsPerWeek: 2,
  overtimeHours: 0,
  weekendFairness: true,
  noticePartTimeDays: 7,
  noticeFullTimeDays: 7,
  laborTargetPercent: 30,
  employerChargesPercent: 0,
};

const r = (start: string, end: string): TimeRange => ({ start, end });
/** Construit les 7 jours : `days` reçoit les plages, les autres jours sont fermés. */
function week(spec: [number[], TimeRange[]][]): OpeningHours {
  const out: OpeningHours = Array.from({ length: 7 }, () => []);
  for (const [days, ranges] of spec) days.forEach((d) => (out[d] = ranges.map((x) => ({ ...x }))));
  return out;
}
const p = (name: string, color: PostColor, weekday: number, weekend: number, selected = true): PostPreset => ({ name, color, weekday, weekend, selected });

export const ACTIVITIES: ActivityPreset[] = [
  {
    id: "restaurant",
    label: "Restaurant",
    hint: "Services midi et soir",
    posts: [p("Salle", "blue", 2, 3), p("Cuisine", "teal", 2, 2), p("Bar", "violet", 1, 1), p("Plonge", "slate", 1, 1, false)],
    opening: week([
      [[1, 2, 3, 4, 5], [r("12:00", "14:30"), r("19:00", "22:30")]],
      [[6], [r("12:00", "15:00")]],
    ]),
    organisation: "coupure",
    teams: 2,
    prepMinutes: 30,
    closeMinutes: 30,
    rules: { splitShifts: "often", maxHoursPerDay: 10 },
  },
  {
    id: "bar",
    label: "Bar / Café",
    hint: "Grande amplitude, ouverture tardive",
    posts: [p("Bar", "violet", 1, 2), p("Salle", "blue", 1, 2), p("Cuisine", "teal", 1, 1, false)],
    opening: week([[[0, 1, 2, 3, 4, 5], [r("10:00", "00:00")]]]),
    organisation: "equipes",
    teams: 2,
    prepMinutes: 30,
    closeMinutes: 30,
    rules: {},
  },
  {
    id: "boulangerie",
    label: "Boulangerie",
    hint: "Vente et production",
    posts: [p("Vente", "pink", 2, 3), p("Production", "indigo", 1, 1), p("Pâtisserie", "fuchsia", 1, 1, false)],
    opening: week([
      [[1, 2, 3, 4, 5], [r("07:00", "19:30")]],
      [[6], [r("07:00", "13:00")]],
    ]),
    organisation: "equipes",
    teams: 2,
    prepMinutes: 30,
    closeMinutes: 15,
    rules: {},
  },
  {
    id: "boutique",
    label: "Boutique",
    hint: "Prêt-à-porter, déco, concept store…",
    posts: [p("Vente", "pink", 2, 3), p("Caisse", "teal", 1, 1), p("Réserve", "indigo", 0, 0, false)],
    opening: week([[[0, 1, 2, 3, 4, 5], [r("10:00", "19:00")]]]),
    organisation: "continu",
    teams: 2,
    prepMinutes: 15,
    closeMinutes: 15,
    rules: {},
  },
  {
    id: "supermarche",
    label: "Supérette / Épicerie",
    hint: "Caisse et mise en rayon",
    posts: [p("Caisse", "teal", 2, 3), p("Mise en rayon", "indigo", 1, 1), p("Accueil", "cyan", 1, 1, false)],
    opening: week([
      [[0, 1, 2, 3, 4, 5], [r("08:30", "20:30")]],
      [[6], [r("09:00", "13:00")]],
    ]),
    organisation: "equipes",
    teams: 2,
    prepMinutes: 30,
    closeMinutes: 15,
    rules: {},
  },
  {
    id: "beaute",
    label: "Coiffure / Beauté",
    hint: "Salon, institut, spa",
    posts: [p("Coiffure", "violet", 2, 3), p("Esthétique", "pink", 1, 1, false), p("Accueil", "cyan", 1, 1)],
    opening: week([[[1, 2, 3, 4, 5], [r("09:00", "19:00")]]]),
    organisation: "continu",
    teams: 2,
    prepMinutes: 15,
    closeMinutes: 15,
    rules: {},
  },
  {
    id: "hotel",
    label: "Hôtel",
    hint: "Ouvert 24 h/24",
    posts: [p("Réception", "blue", 1, 1), p("Étages", "indigo", 2, 2), p("Petit-déjeuner", "teal", 1, 1, false)],
    opening: week([[[0, 1, 2, 3, 4, 5, 6], [r("07:00", "07:00")]]]),
    organisation: "equipes",
    teams: 3,
    prepMinutes: 0,
    closeMinutes: 0,
    rules: {},
  },
  {
    id: "agence",
    label: "Agence / Bureau",
    hint: "Immobilier, intérim, accueil…",
    posts: [p("Accueil", "cyan", 1, 1), p("Conseil", "blue", 2, 1), p("Direction", "slate", 0, 0, false)],
    opening: week([
      [[0, 1, 2, 3, 4], [r("09:00", "18:00")]],
      [[5], [r("09:30", "12:30")]],
    ]),
    organisation: "continu",
    teams: 2,
    prepMinutes: 0,
    closeMinutes: 0,
    rules: {},
  },
  {
    id: "autre",
    label: "Autre activité",
    hint: "Je configure tout moi-même",
    posts: [p("Polyvalent", "blue", 2, 2)],
    opening: week([[[0, 1, 2, 3, 4, 5], [r("09:00", "18:00")]]]),
    organisation: "continu",
    teams: 2,
    prepMinutes: 0,
    closeMinutes: 0,
    rules: {},
  },
];

export const activity = (id: ActivityId) => ACTIVITIES.find((a) => a.id === id) ?? ACTIVITIES[ACTIVITIES.length - 1];

export const ORGANISATIONS: { id: Organisation; label: string; text: string; example: string }[] = [
  { id: "coupure", label: "Services séparés", text: "Un créneau par service (midi, soir…). Une même personne peut faire les deux avec une coupure.", example: "Midi 11h30–15h · Soir 18h30–23h" },
  { id: "continu", label: "Journée continue", text: "Chacun fait sa journée d'un bloc, avec une pause déjeuner.", example: "9h–18h avec 1 h de pause" },
  { id: "equipes", label: "Équipes qui se relaient", text: "La journée est partagée entre plusieurs équipes (ouverture / fermeture, 3×8…).", example: "Matin 7h–14h · Après-midi 14h–21h" },
  { id: "libre", label: "Créneaux sur mesure", text: "Vous définissez vous-même vos créneaux types.", example: "Ex. 6h–13h, 10h–15h, 17h–23h" },
];

// ---- Construction des créneaux types ---------------------------------------

type Window = { start: number; end: number }; // minutes, end peut dépasser 1440

function rangeToWindow(x: TimeRange): Window {
  const s = toMinutes(x.start);
  let e = toMinutes(x.end);
  if (e <= s) e += 1440;
  return { start: s, end: e };
}

const round15 = (m: number) => Math.round(m / 15) * 15;

function nameFor(start: number, index: number, count: number, organisation: Organisation): string {
  if (count === 1 && organisation === "continu") return "Journée";
  if (organisation === "equipes" || (organisation === "continu" && count === 2)) {
    if (count === 2) return index === 0 ? "Ouverture" : "Fermeture";
    return ["Matin", "Après-midi", "Nuit"][index] ?? `Équipe ${index + 1}`;
  }
  const h = (start % 1440) / 60;
  if (h < 10.5) return "Matin";
  if (h < 16) return index === 0 && count > 1 ? "Midi" : h < 13 ? "Midi" : "Après-midi";
  return "Soir";
}

/** Créneaux d'une journée selon le mode d'organisation. */
function windowsForDay(ranges: TimeRange[], org: Organisation, teams: number, prep: number, close: number, maxHours: number): { w: Window; breakMin: number }[] {
  if (!ranges.length) return [];
  const ws = ranges.map(rangeToWindow).sort((a, b) => a.start - b.start);
  const first = ws[0].start - prep;
  const last = ws[ws.length - 1].end + close;

  if (org === "coupure" || org === "libre") {
    // Pause obligatoire de 20 min dès 6 h de travail
    return ws.map((w) => {
      const span = w.end + close - (w.start - prep);
      return { w: { start: w.start - prep, end: w.end + close }, breakMin: span >= 6 * 60 ? 20 : 0 };
    });
  }

  let n = org === "equipes" ? teams : 1;
  const span = last - first;
  if (org === "continu") {
    const pause = span > 6 * 60 ? 60 : 0;
    if (span - pause <= maxHours * 60) return [{ w: { start: first, end: last }, breakMin: pause }];
    n = 2; // trop long pour une seule journée : on passe en ouverture / fermeture
  }
  const step = span / n;
  return Array.from({ length: n }, (_, i) => {
    const s = round15(first + step * i);
    const e = i === n - 1 ? last : round15(first + step * (i + 1));
    return { w: { start: s, end: e }, breakMin: e - s > 6 * 60 ? 30 : 0 };
  });
}

/**
 * Transforme les horaires d'ouverture en créneaux types.
 * Les jours qui diffèrent du cas le plus fréquent reçoivent des horaires spécifiques.
 */
export function buildServices(
  opening: OpeningHours,
  org: Organisation,
  teams: number,
  prep: number,
  close: number,
  maxHours: number,
): Service[] {
  const perDay = opening.map((ranges) => windowsForDay(ranges, org, teams, prep, close, maxHours));
  const count = Math.max(0, ...perDay.map((x) => x.length));
  const services: Service[] = [];

  for (let i = 0; i < count; i++) {
    const days = perDay.map((x, d) => (x[i] ? d : -1)).filter((d) => d >= 0);
    // Horaires les plus fréquents pour ce créneau
    const freq = new Map<string, number>();
    days.forEach((d) => {
      const k = `${perDay[d][i].w.start}-${perDay[d][i].w.end}`;
      freq.set(k, (freq.get(k) ?? 0) + 1);
    });
    const baseKey = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const [base, baseEnd] = baseKey.split("-").map(Number);
    const overrides: Record<number, TimeRange> = {};
    days.forEach((d) => {
      const w = perDay[d][i].w;
      if (`${w.start}-${w.end}` !== baseKey) overrides[d] = { start: fromMinutes(w.start), end: fromMinutes(w.end) };
    });
    const sample = perDay[days[0]][i];
    services.push({
      id: `sv${i + 1}`,
      name: nameFor(base, i, count, org),
      start: fromMinutes(base),
      end: fromMinutes(baseEnd),
      breakMinutes: sample.breakMin || undefined,
      overrides: Object.keys(overrides).length ? overrides : undefined,
      days: days.length === 7 ? undefined : days,
    });
  }

  // Un seul jour avec une seule plage (ex. dimanche midi) : on le rattache au
  // créneau dont les horaires sont les plus proches.
  if (org === "coupure" && count === 2) {
    opening.forEach((ranges, d) => {
      if (ranges.length !== 1) return;
      const w = perDay[d][0].w;
      const dist = (sv: Service) => Math.abs(toMinutes(sv.start) - w.start);
      const target = services.reduce((a, b) => (dist(b) < dist(a) ? b : a));
      for (const sv of services) {
        sv.days = (sv.days ?? [0, 1, 2, 3, 4, 5, 6]).filter((x) => x !== d);
        if (sv.overrides) delete sv.overrides[d];
      }
      target.days = [...(target.days ?? []), d].sort();
      if (fromMinutes(w.start) !== target.start || fromMinutes(w.end) !== target.end) {
        target.overrides = { ...(target.overrides ?? {}), [d]: { start: fromMinutes(w.start), end: fromMinutes(w.end) } };
      }
    });
  }
  return services;
}
