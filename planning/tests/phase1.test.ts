// Phase 1 : un planning automatique que le gérant garde.
import { describe, expect, it } from "vitest";
import { createDemoState } from "@/lib/demo-data";
import { explainUnfilled, generateWeek } from "@/lib/generate";
import { checkWeek, checkEmployee, openDaysBetween } from "@/lib/engine/check";
import { diffWeek, snapshotOf, weekStatus, whatsappChanges } from "@/lib/publish";
import { history } from "@/lib/fairness";
import { laborOfWeek } from "@/lib/labor";
import { answerRequest, swapProblems } from "@/lib/requests";
import { addWeeks, dateOfDay } from "@/lib/time";
import type { AppState, Shift } from "@/lib/types";

const demo = () => createDemoState();
const sig = (s: Shift) => `${s.id}|${s.employeeId}|${s.day}|${s.start}|${s.end}|${s.postId}`;

describe("Verrous et régénération", () => {
  it("régénérer garde les créneaux verrouillés et ceux faits à la main", () => {
    const s = demo();
    const first = generateWeek(s).shifts;
    const kept = [{ ...first[0], locked: true }, { ...first[5], manual: true, start: "10:30" }];
    const again = generateWeek(s, { seed: 7, fixed: kept }).shifts;
    for (const k of kept) expect(again.map(sig)).toContain(sig(k));
  });
  it("un salarié verrouillé garde exactement sa semaine", () => {
    const s = demo();
    const first = generateWeek(s).shifts;
    const camille = first.filter((x) => x.employeeId === "e1");
    const again = generateWeek(s, { seed: 9, fixed: camille, lockedEmployees: ["e1"] }).shifts;
    expect(again.filter((x) => x.employeeId === "e1").map(sig).sort()).toEqual(camille.map(sig).sort());
  });
  it("régénérer un seul jour ne touche pas aux autres jours", () => {
    const s = demo();
    const first = generateWeek(s).shifts;
    const others = first.filter((x) => x.day !== 3);
    const again = generateWeek(s, { seed: 4, fixed: others, onlyDay: 3 }).shifts;
    expect(again.filter((x) => x.day !== 3).map(sig).sort()).toEqual(others.map(sig).sort());
    expect(again.some((x) => x.day === 3)).toBe(true);
    expect(checkWeek(s, again).filter((i) => i.severity === "error")).toEqual([]);
  });
});

describe("« Pourquoi lui ? »", () => {
  it("chaque créneau généré explique son choix", () => {
    const shifts = generateWeek(demo()).shifts;
    for (const x of shifts) {
      expect(x.reason?.length, `${x.employeeId} ${x.day}`).toBeGreaterThan(1);
      expect(x.reason!.join(" ")).toMatch(/Disponible, repos et règles respectés/);
    }
  });
  it("une place vide est expliquée personne par personne", () => {
    const s = demo();
    const shifts = generateWeek(s).shifts;
    // On demande 6 cuisiniers le samedi soir : impossible avec 3 personnes
    const lines = explainUnfilled(s, shifts, 5, "soir", "cuisine");
    expect(lines.length).toBe(3);
    expect(lines.join(" ")).toMatch(/Thomas|Sarah|Karim/);
    expect(explainUnfilled({ ...s, employees: s.employees.map((e) => ({ ...e, postIds: e.postIds.filter((p) => p !== "bar") })) }, shifts, 5, "soir", "bar")[0]).toMatch(/Personne n'a le poste/);
  });
});

describe("Disponibilités et préférences", () => {
  it("étudiant : pas avant 17 h → un créneau du midi est interdit", () => {
    const s = demo();
    const hugo = s.employees.find((e) => e.id === "e4")!;
    const l = checkEmployee(s, hugo, [{ id: "x", day: 2, start: "11:00", end: "15:00", postId: "salle" }]);
    expect(l.some((i) => i.kind === "unavailable" && i.severity === "error" && /à partir de 17h/.test(i.detail))).toBe(true);
  });
  it("le générateur respecte les plages horaires (Hugo jamais avant 17 h du mardi au jeudi)", () => {
    const shifts = generateWeek(demo()).shifts.filter((x) => x.employeeId === "e4" && [1, 2, 3].includes(x.day));
    expect(shifts.every((x) => x.start >= "17:00")).toBe(true);
  });
  it("« préfère le soir » : Léa a plus de soirs que de midis", () => {
    const lea = generateWeek(demo()).shifts.filter((x) => x.employeeId === "e8");
    expect(lea.filter((x) => x.start >= "17:00").length).toBeGreaterThan(lea.filter((x) => x.start < "17:00").length);
  });
});

describe("Équité sur plusieurs semaines", () => {
  it("compte week-ends, fermetures et coupures à partir des plannings passés", () => {
    const s = demo();
    const h = history(s, s.currentWeek);
    const prev = s.plans[addWeeks(s.currentWeek, -1)];
    for (const e of s.employees) {
      const worked = prev.some((x) => x.employeeId === e.id && x.day >= 5) ? 1 : 0;
      // historique d'une semaine + chiffre de la fiche pour les 3 semaines manquantes
      expect(h[e.id].weekends).toBeCloseTo(worked + (e.weekendHistory * 3) / 4);
      expect(h[e.id].weeks).toBe(1);
    }
  });
});

describe("Publication et changements", () => {
  it("après publication, seuls les changements sont listés, pour les bonnes personnes", () => {
    const s = demo();
    const week = addWeeks(s.currentWeek, -1);
    const pub = s.weekMeta![week].snapshot!;
    const changed = pub.map((x, i) => (i === 0 ? { ...x, start: "12:00" } : x));
    const { status, changes } = weekStatus(s.weekMeta![week], changed);
    expect(status).toBe("modified");
    expect(changes).toHaveLength(1);
    const msg = whatsappChanges(s, week, changes, "semaine", "https://exemple.fr/p/x");
    const who = s.employees.find((e) => e.id === pub[0].employeeId)!.firstName;
    expect(msg).toContain(who);
    const others = s.employees.filter((e) => e.firstName !== who).map((e) => `*${e.firstName}*`);
    for (const o of others) expect(msg).not.toContain(o);
  });
  it("aucune différence → semaine « publiée »", () => {
    const s = demo();
    const week = addWeeks(s.currentWeek, -1);
    const meta = { ...s.weekMeta![week], snapshot: snapshotOf(s.plans[week]) };
    expect(weekStatus(meta, s.plans[week]).status).toBe("published");
    expect(diffWeek(s.plans[week], snapshotOf(s.plans[week]))).toEqual([]);
    // La démo contient un remplacement urgent fait après publication : semaine « modifiée »
    expect(weekStatus(s.weekMeta![week], s.plans[week]).status).toBe("modified");
  });
});

describe("Délai de prévenance", () => {
  const setup = () => {
    const s = demo();
    const week = s.currentWeek; // semaine suivante (lundi fermé)
    const shifts = generateWeek(s).shifts;
    const st: AppState = { ...s, plans: { ...s.plans, [week]: shifts }, weekMeta: { ...s.weekMeta, [week]: { status: "published", snapshot: snapshotOf(shifts) } } };
    return { st, week, shifts };
  };
  it("temps partiel modifié 2 jours avant → alerte (7 jours ouvrés demandés)", () => {
    const { st, week, shifts } = setup();
    const hugoShift = shifts.find((x) => x.employeeId === "e4" && x.day >= 3)!;
    const changed = shifts.map((x) => (x.id === hugoShift.id ? { ...x, end: "22:00" } : x));
    const today = dateOfDay(week, hugoShift.day - 2);
    const issues = checkWeek(st, changed, week, { today });
    const n = issues.find((i) => i.kind === "notice");
    expect(n?.severity).toBe("warning");
    expect(n?.detail).toMatch(/temps partiel/);
    expect(n?.detail).toMatch(/comptable/);
  });
  it("modifié bien à l'avance → pas d'alerte", () => {
    const { st, week, shifts } = setup();
    const changed = shifts.map((x, i) => (i === 0 ? { ...x, end: "22:00" } : x));
    const today = dateOfDay(week, -20);
    expect(checkWeek(st, changed, week, { today }).some((i) => i.kind === "notice")).toBe(false);
  });
  it("semaine non publiée → aucun délai de prévenance", () => {
    const s = demo();
    const shifts = generateWeek(s).shifts;
    expect(checkWeek(s, shifts, s.currentWeek, { today: dateOfDay(s.currentWeek, 0) }).some((i) => i.kind === "notice")).toBe(false);
  });
  it("jours ouvrés = jours d'ouverture de l'établissement (lundi fermé non compté)", () => {
    const s = demo();
    // du lundi au lundi suivant : mardi → dimanche = 6 jours ouverts
    expect(openDaysBetween(s, dateOfDay(s.currentWeek, 0), dateOfDay(s.currentWeek, 7))).toBe(6);
  });
});

describe("Masse salariale / chiffre d'affaires", () => {
  it("le ratio = coût des heures planifiées ÷ CA prévu", () => {
    const s = demo();
    const shifts = generateWeek(s).shifts;
    const l = laborOfWeek(s, s.currentWeek, shifts);
    expect(l.revenue).toBe(1800 + 2100 + 2300 + 3600 + 4300 + 2700);
    expect(l.ratio).toBeCloseTo(l.cost / l.revenue!, 5);
    expect(l.days[0].ratio).toBeNull(); // lundi fermé, pas de CA
    const withCharges = laborOfWeek({ ...s, rules: { ...s.rules, employerChargesPercent: 40 } }, s.currentWeek, shifts);
    expect(withCharges.cost).toBeCloseTo(l.cost * 1.4, 1);
  });
});

describe("Demandes de l'équipe", () => {
  it("la démo contient 2 disponibilités, 1 congé et 1 échange en attente du gérant", () => {
    const r = demo().requests!.filter((x) => x.status === "pending");
    expect(r.filter((x) => x.type === "availability")).toHaveLength(2);
    expect(r.filter((x) => x.type === "leave")).toHaveLength(1);
    expect(r.filter((x) => x.type === "swap")).toHaveLength(1);
  });
  it("accepter un congé crée l'absence ; accepter un échange vérifié déplace le créneau", () => {
    const s = demo();
    const leave = s.requests!.find((x) => x.type === "leave")!;
    const a = answerRequest(s, leave.id, true);
    expect(a.absences.some((x) => x.employeeId === leave.employeeId && x.type === "cp")).toBe(true);
    const swap = s.requests!.find((x) => x.type === "swap") as Extract<NonNullable<AppState["requests"]>[number], { type: "swap" }>;
    expect(swapProblems(s, swap)).toEqual([]);
    const b = answerRequest(s, swap.id, true);
    expect(b.plans[swap.week].find((x) => x.id === swap.shiftId)!.employeeId).toBe(swap.toEmployeeId);
  });
  it("un échange qui casserait une règle est signalé", () => {
    const s = demo();
    const swap = s.requests!.find((x) => x.type === "swap") as Extract<NonNullable<AppState["requests"]>[number], { type: "swap" }>;
    // Manon (étudiante du week-end) ne peut pas prendre un créneau en semaine
    const bad = { ...swap, toEmployeeId: "e10" };
    const shift = s.plans[swap.week].find((x) => x.id === swap.shiftId)!;
    if (shift.day < 5) expect(swapProblems(s, bad).length).toBeGreaterThan(0);
  });
  it("accepter une disponibilité met à jour la fiche", () => {
    const s = demo();
    const r = s.requests!.find((x) => x.type === "availability" && x.employeeId === "e9")!;
    const a = answerRequest(s, r.id, true);
    expect(a.employees.find((e) => e.id === "e9")!.unavailability.some((u) => u.day === 6)).toBe(true);
  });
});
