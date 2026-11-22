// Absences, jours fériés, remplacement, compteurs, exports et anonymisation.
import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { createDemoState } from "@/lib/demo-data";
import { easterSunday, holidaysInWeek, holidaysOfYear } from "@/lib/holidays";
import { needsForWeek } from "@/lib/week";
import { generateWeek } from "@/lib/generate";
import { checkWeek } from "@/lib/engine/check";
import { absencesForWeek, expectedHours } from "@/lib/absences";
import { replacementCandidates } from "@/lib/replace";
import { monthCounters, weekCounters } from "@/lib/counters";
import { monthSheet, toCSV, toXlsx } from "@/lib/export";
import { deleteEmployee } from "@/lib/employees";
import { hoursByEmployee } from "@/lib/rules";
import { addWeeks, toISODate } from "@/lib/time";
import type { AppState } from "@/lib/types";

const iso = (d: Date) => toISODate(d);

describe("Jours fériés", () => {
  it("calcule Pâques correctement", () => {
    expect(iso(easterSunday(2025))).toBe("2025-04-20");
    expect(iso(easterSunday(2026))).toBe("2026-04-05");
    expect(iso(easterSunday(2027))).toBe("2027-03-28");
  });
  it("calcule Lundi de Pâques, Ascension et Pentecôte", () => {
    const h = Object.fromEntries(holidaysOfYear(2026).map((x) => [x.id, x.date]));
    expect(h.paques).toBe("2026-04-06");
    expect(h.ascension).toBe("2026-05-14");
    expect(h.pentecote).toBe("2026-05-25");
    expect(holidaysOfYear(2026)).toHaveLength(11);
  });
  it("repère Noël dans la bonne semaine", () => {
    expect(holidaysInWeek("2026-12-21").get(4)?.id).toBe("noel");
  });
  it("un férié fermé n'a aucun besoin et la génération n'y place personne", () => {
    const s = createDemoState();
    const state: AppState = { ...s, currentWeek: "2026-12-21", establishment: { ...s.establishment, closedHolidays: ["noel"] }, absences: [] };
    expect(Object.keys(needsForWeek(state, "2026-12-21")).some((k) => k.startsWith("4|"))).toBe(false);
    expect(generateWeek(state).shifts.some((x) => x.day === 4)).toBe(false);
  });
});

describe("Absences", () => {
  const s = createDemoState(); // Léa (e8) en congés payés vendredi et samedi
  it("bloquent la génération", () => {
    const shifts = generateWeek(s).shifts;
    expect(shifts.some((x) => x.employeeId === "e8" && (x.day === 4 || x.day === 5))).toBe(false);
  });
  it("un créneau posé pendant une absence est interdit", () => {
    const shifts = [{ id: "z", employeeId: "e8", day: 4, start: "18:00", end: "23:00", postId: "bar" }];
    expect(checkWeek(s, shifts).some((i) => i.kind === "absence" && i.severity === "error")).toBe(true);
  });
  it("réduisent les heures à planifier (congés payés) mais pas un repos demandé", () => {
    const lea = s.employees.find((e) => e.id === "e8")!;
    expect(expectedHours(lea, absencesForWeek(s, s.currentWeek).get("e8"), s.rules)).toBeCloseTo(21);
    expect(expectedHours(lea, new Map([[1, "repos" as const]]), s.rules)).toBe(35);
  });
});

describe("Remplacement", () => {
  it("propose des remplaçants qui ne créent aucune règle interdite, poste principal en premier", () => {
    const s = createDemoState();
    const shifts = generateWeek(s).shifts;
    const shift = shifts.find((x) => x.postId === "salle")!;
    const list = replacementCandidates(s, s.currentWeek, shifts, shift);
    expect(list.length).toBeGreaterThan(0);
    for (const c of list) {
      const next = shifts.map((x) => (x.id === shift.id ? { ...x, employeeId: c.employee.id } : x));
      const errors = checkWeek(s, next).filter((i) => i.severity === "error" && i.employeeId === c.employee.id);
      // Seul blocage toléré : les heures sup, clairement signalées et proposées en dernier
      if (c.overContract) expect(errors.every((i) => i.kind === "contractOver")).toBe(true);
      else expect(errors).toEqual([]);
    }
    const firstOver = list.findIndex((c) => c.overContract);
    if (firstOver >= 0) expect(list.slice(firstOver).every((c) => c.overContract)).toBe(true);
    const normal = list.filter((c) => !c.overContract);
    const firstSecondary = normal.findIndex((c) => !c.mainPost);
    if (firstSecondary >= 0) expect(normal.slice(firstSecondary).every((c) => !c.mainPost)).toBe(true);
  });
});

describe("Compteurs", () => {
  const s = createDemoState();
  const shifts = generateWeek(s).shifts;
  const state: AppState = { ...s, plans: { ...s.plans, [s.currentWeek]: shifts } };
  it("semaine : heures planifiées, dimanches, absences", () => {
    const h = hoursByEmployee(shifts);
    const c = weekCounters(state, s.currentWeek);
    for (const x of c) expect(x.planned).toBeCloseTo(h[x.employee.id] ?? 0);
    const lea = c.find((x) => x.employee.id === "e8")!;
    expect(lea.absences.cp).toBe(2);
    expect(lea.expected).toBeCloseTo(21);
    const sundays = new Set(shifts.filter((x) => x.day === 6).map((x) => x.employeeId));
    expect(c.filter((x) => x.sundays > 0).length).toBe(sundays.size);
  });
  it("mois : contrat mensualisé (hebdo × 52 ÷ 12) et coût estimé", () => {
    const d = new Date(s.currentWeek + "T12:00:00");
    const c = monthCounters(state, d.getFullYear(), d.getMonth());
    const camille = c.find((x) => x.employee.id === "e1")!;
    expect(camille.contract).toBeCloseTo((35 * 52) / 12, 1);
    expect(camille.cost).toBeCloseTo(camille.planned * 13.5, 1);
  });
});

describe("Exports comptables", () => {
  const s = createDemoState();
  const d = new Date(addWeeks(s.currentWeek, -1) + "T12:00:00");
  const sheet = monthSheet(s, d.getFullYear(), d.getMonth());
  it("CSV lisible par Excel en français (BOM, « ; », virgule décimale)", () => {
    const csv = toCSV(sheet);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Salarié;Contrat hebdo (h)");
    expect(csv).toMatch(/151,67/); // 35 h × 52 ÷ 12
  });
  it("fichier Excel valide contenant les salariés", () => {
    const files = unzipSync(toXlsx(sheet));
    expect(Object.keys(files)).toContain("xl/worksheets/sheet1.xml");
    expect(strFromU8(files["xl/worksheets/sheet1.xml"])).toContain("Camille Martin");
  });
});

describe("Suppression d'un salarié", () => {
  it("anonymise l'historique et retire les semaines à venir", () => {
    const s = createDemoState();
    const past = addWeeks(s.currentWeek, -1); // semaine en cours (déjà remplie)
    const pastShifts = generateWeek(s).shifts.map((x) => ({ ...x }));
    const state: AppState = { ...s, plans: { "2020-01-06": pastShifts, [past]: s.plans[past], [s.currentWeek]: pastShifts } };
    const out = deleteEmployee(state, "e8", new Date(past + "T12:00:00"));
    const e = out.employees.find((x) => x.id === "e8")!;
    expect(e.archived).toBe(true);
    expect(e.firstName).toBe("Ancien salarié");
    expect(e.lastName).not.toContain("Fontaine");
    expect(e.hourlyRate).toBeUndefined();
    expect(out.absences.some((a) => a.employeeId === "e8")).toBe(false);
    expect(out.plans["2020-01-06"].some((x) => x.employeeId === "e8")).toBe(true); // historique gardé
    expect(out.plans[s.currentWeek].some((x) => x.employeeId === "e8")).toBe(false); // à venir retiré
    expect(JSON.stringify(out)).not.toContain("Fontaine");
  });
});
