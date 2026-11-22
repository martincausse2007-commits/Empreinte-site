// Tests du module de vérification (une règle = au moins un test) et du générateur.
import { describe, expect, it } from "vitest";
import { createDemoState } from "@/lib/demo-data";
import { checkEmployee, checkWeek, type IssueKind } from "@/lib/engine/check";
import { applyReinforcements, generateWeek, suggestReinforcements } from "@/lib/generate";
import { hoursByEmployee } from "@/lib/rules";
import { ACTIVITIES } from "@/lib/presets";
import { draftFor, exampleTeam, stateFromDraft } from "@/lib/setup";
import type { AppState, Employee, Rules, Shift } from "@/lib/types";

let n = 0;
const sh = (day: number, start: string, end: string, extra: Partial<Shift> = {}): Shift => ({ id: `t${n++}`, employeeId: "x", day, start, end, postId: "salle", ...extra });
const emp = (p: Partial<Employee> = {}): Employee => ({ id: "x", firstName: "Test", lastName: "", postIds: ["salle"], contractHours: 35, unavailability: [], weekendHistory: 0, ...p });
const base = (rules: Partial<Rules> = {}): AppState => {
  const s = createDemoState();
  return { ...s, rules: { ...s.rules, ...rules } };
};
const kinds = (state: AppState, e: Employee, shifts: Shift[], prev?: Shift[]) => checkEmployee(state, e, shifts.map((s) => ({ ...s, employeeId: e.id })), { prev });
const has = (list: { kind: IssueKind; severity: string }[], k: IssueKind, sev?: "error" | "warning") => list.some((i) => i.kind === k && (!sev || i.severity === sev));

/** Semaine « propre » de 35 h : mardi → samedi, 11h-15h + 18h-21h. */
const clean = () => [1, 2, 3, 4, 5].flatMap((d) => [sh(d, "11:00", "15:00"), sh(d, "18:00", "21:00")]);

describe("Une semaine correcte ne déclenche aucune alerte", () => {
  it("35 h, 2 jours de repos à la suite, coupures autorisées", () => {
    expect(kinds(base({ splitShifts: "often" }), emp(), clean())).toEqual([]);
  });
});

describe("Règles interdites (rouge)", () => {
  it("disponibilités", () => {
    const e = emp({ unavailability: [{ day: 2, serviceId: "all" }] });
    expect(has(kinds(base({ splitShifts: "often" }), e, clean()), "unavailable", "error")).toBe(true);
  });
  it("chevauchement de deux créneaux", () => {
    expect(has(kinds(base(), emp(), [sh(1, "11:00", "15:00"), sh(1, "14:00", "18:00")]), "overlap", "error")).toBe(true);
  });
  it("repos quotidien de 11 h entre deux journées", () => {
    const l = kinds(base(), emp(), [sh(1, "18:00", "01:00"), sh(2, "10:00", "14:00")]);
    expect(has(l, "dailyRest", "error")).toBe(true);
  });
  it("repos de 11 h entre le dimanche de la semaine précédente et le lundi", () => {
    const prev = [sh(6, "18:00", "23:30", { employeeId: "x" })];
    expect(has(kinds(base(), emp(), [sh(0, "08:00", "12:00")], prev), "dailyRest", "error")).toBe(true);
  });
  it("repos hebdomadaire de 35 h consécutives", () => {
    // Repos mercredi et samedi, mais jamais 35 h d'affilée
    const l = kinds(base({ consecutiveRestDays: false }), emp(), [sh(0, "11:00", "15:00"), sh(1, "18:00", "23:00"), sh(3, "09:00", "13:00"), sh(4, "18:00", "23:00"), sh(6, "09:00", "13:00")]);
    expect(has(l, "weeklyRest", "error")).toBe(true);
  });
  it("nombre de jours de repos", () => {
    const l = kinds(base(), emp(), [0, 1, 2, 3, 4, 5].map((d) => sh(d, "11:00", "15:00")));
    expect(has(l, "restDays", "error")).toBe(true);
  });
  it("durée maximale par jour (réglable)", () => {
    expect(has(kinds(base({ maxHoursPerDay: 10 }), emp(), [sh(1, "08:00", "20:00", { breakMinutes: 60 })]), "dayHours", "error")).toBe(true);
    expect(has(kinds(base({ maxHoursPerDay: 12 }), emp(), [sh(1, "08:00", "20:00", { breakMinutes: 60 })]), "dayHours")).toBe(false);
  });
  it("48 h maximum par semaine", () => {
    const l = kinds(base({ maxHoursPerDay: 12, overtimeHours: 20 }), emp({ contractHours: 45 }), [1, 2, 3, 4, 5].map((d) => sh(d, "08:00", "18:30", { breakMinutes: 30 })));
    expect(has(l, "weekHours", "error")).toBe(true);
  });
  it("amplitude d'une journée avec coupure", () => {
    const l = kinds(base({ splitShifts: "often", maxAmplitudeHours: 13 }), emp(), [sh(1, "09:00", "12:00"), sh(1, "20:00", "23:30")]);
    expect(has(l, "amplitude", "error")).toBe(true);
  });
  it("coupure interdite quand le gérant a choisi « jamais »", () => {
    expect(has(kinds(base({ splitShifts: "never" }), emp(), [sh(1, "11:00", "15:00"), sh(1, "18:00", "22:00")]), "split", "error")).toBe(true);
  });
  it("nombre maximum de coupures par semaine", () => {
    const shifts = [1, 2, 3].flatMap((d) => [sh(d, "11:00", "14:00"), sh(d, "18:00", "21:00")]);
    expect(has(kinds(base({ splitShifts: "limited", maxSplitsPerWeek: 2 }), emp(), shifts), "split", "error")).toBe(true);
  });
  it("pause de 20 min dès 6 h de travail", () => {
    expect(has(kinds(base(), emp(), [sh(1, "09:00", "15:30")]), "pause", "error")).toBe(true);
    expect(has(kinds(base(), emp(), [sh(1, "09:00", "15:30", { breakMinutes: 20 })]), "pause")).toBe(false);
    // Une coupure compte comme pause
    expect(has(kinds(base({ splitShifts: "often" }), emp(), [sh(1, "09:00", "12:00"), sh(1, "18:00", "22:00")]), "pause")).toBe(false);
  });
  it("heures au-dessus du contrat (au-delà des heures sup autorisées)", () => {
    const l = kinds(base({ splitShifts: "often", overtimeHours: 0 }), emp({ contractHours: 30 }), clean());
    expect(has(l, "contractOver", "error")).toBe(true);
  });
});

describe("Préférences et points à vérifier (ambre)", () => {
  it("heures sup dans la limite autorisée", () => {
    const l = kinds(base({ splitShifts: "often", overtimeHours: 6 }), emp({ contractHours: 30 }), clean());
    expect(has(l, "contractOver")).toBe(false);
    expect(has(l, "overtime", "warning")).toBe(true);
  });
  it("Léa : 20 h planifiées pour 35 h → heures payées non planifiées", () => {
    const l = kinds(base(), emp({ firstName: "Léa" }), [1, 2, 3, 4].map((d) => sh(d, "18:00", "23:00")));
    const issue = l.find((i) => i.kind === "contractUnder");
    expect(issue?.severity).toBe("warning");
    expect(issue?.title).toContain("15 h");
  });
  it("Camille : repos lundi + jeudi alors que « repos à la suite » est activé", () => {
    const days = [1, 2, 4, 5, 6];
    const l = kinds(base({ consecutiveRestDays: true, splitShifts: "often" }), emp({ firstName: "Camille" }), days.map((d) => sh(d, "11:00", "15:00")));
    expect(has(l, "consecutiveRest", "warning")).toBe(true);
  });
  it("repos dimanche + lundi compte comme « à la suite »", () => {
    const l = kinds(base({ consecutiveRestDays: true }), emp(), [1, 2, 3, 4, 5].map((d) => sh(d, "11:00", "15:00")));
    expect(has(l, "consecutiveRest")).toBe(false);
  });
  it("poste qui n'est pas dans la fiche", () => {
    expect(has(kinds(base(), emp({ postIds: ["cuisine"] }), [sh(1, "11:00", "15:00")]), "offPost", "warning")).toBe(true);
  });
  it("équité des week-ends", () => {
    expect(has(kinds(base(), emp({ weekendHistory: 4 }), [sh(5, "11:00", "15:00")]), "weekend", "warning")).toBe(true);
    // Pas d'alerte pour quelqu'un qui ne peut travailler que le week-end
    const student = emp({ weekendHistory: 4, unavailability: [0, 1, 2, 3, 4].map((day) => ({ day, serviceId: "all" as const })) });
    expect(has(kinds(base(), student, [sh(5, "11:00", "15:00")]), "weekend")).toBe(false);
  });
  it("poste non couvert", () => {
    const s = createDemoState();
    expect(checkWeek(s, []).some((i) => i.kind === "uncovered" && i.severity === "warning")).toBe(true);
  });
});

describe("« Tout est en règle » est honnête", () => {
  it("la semaine 48 de la démo (contrats non remplis) n'est PAS « en règle »", () => {
    const s = createDemoState();
    const issues = checkWeek(s, generateWeek(s).shifts);
    expect(issues.some((i) => i.kind === "contractUnder")).toBe(true);
  });
});

describe("Générateur", () => {
  const demo = createDemoState();
  const res = generateWeek(demo);
  const withReinf = applyReinforcements(res.shifts, suggestReinforcements(demo, res.shifts));

  it("couvre tous les besoins de la démo sans aucune règle interdite", () => {
    expect(res.unfilled).toBe(0);
    expect(checkWeek(demo, res.shifts).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("respecte les repos à la suite sur la démo (Camille comprise)", () => {
    expect(checkWeek(demo, res.shifts).filter((i) => i.kind === "consecutiveRest")).toEqual([]);
  });

  it("vise les contrats : Léa, Inès et Karim atteignent leurs heures grâce aux renforts", () => {
    const h = hoursByEmployee(withReinf);
    const by = (name: string) => demo.employees.find((e) => e.firstName === name)!;
    for (const name of ["Léa", "Inès", "Karim"]) expect(h[by(name).id]).toBeCloseTo(by(name).contractHours, 1);
    expect(checkWeek(demo, withReinf).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("réduit fortement les heures payées non planifiées (≈ 54 h avant correction)", () => {
    const h = hoursByEmployee(withReinf);
    const missing = demo.employees.reduce((a, e) => a + Math.max(0, e.contractHours - (h[e.id] ?? 0)), 0);
    expect(missing).toBeLessThan(16);
  });

  it("les renforts n'enfreignent jamais une règle, quelle que soit l'activité", () => {
    for (const a of ACTIVITIES) {
      const d = draftFor(a.id);
      d.employees = exampleTeam(d);
      const s = stateFromDraft(d);
      const g = generateWeek(s);
      const all = applyReinforcements(g.shifts, suggestReinforcements(s, g.shifts));
      expect(checkWeek(s, all).filter((i) => i.severity === "error"), a.label).toEqual([]);
    }
  });
});
