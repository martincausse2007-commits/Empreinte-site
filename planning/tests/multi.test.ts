// Plusieurs établissements et conventions collectives.
import { describe, expect, it } from "vitest";
import { createDemoStore } from "@/lib/demo-store";
import { CONVENTIONS, findConvention, suggestedConvention } from "@/lib/conventions";
import { draftFor, stateFromDraft } from "@/lib/setup";
import { generateWeek } from "@/lib/generate";
import { checkWeek } from "@/lib/engine/check";

describe("Démo à plusieurs établissements", () => {
  const store = createDemoStore();
  it("contient un restaurant et une boutique, chacun avec son équipe", () => {
    const items = Object.values(store.items);
    expect(items.map((s) => s.establishment.type).sort()).toEqual(["boutique", "restaurant"]);
    for (const s of items) expect(s.employees.length).toBeGreaterThan(3);
  });
  it("chaque établissement se génère sans aucune règle interdite", () => {
    for (const s of Object.values(store.items)) {
      const r = generateWeek(s);
      expect(r.unfilled).toBe(0);
      expect(checkWeek(s, r.shifts).filter((i) => i.severity === "error")).toEqual([]);
    }
  });
});

describe("Conventions collectives", () => {
  it("propose HCR pour un restaurant, un bar ou un hôtel", () => {
    expect(suggestedConvention("restaurant")).toBe("1979");
    expect(suggestedConvention("bar")).toBe("1979");
    expect(suggestedConvention("hotel")).toBe("1979");
    expect(suggestedConvention("boutique")).toBe("1517");
  });
  it("applique les limites HCR dans le questionnaire (11 h par jour, amplitude 13 h)", () => {
    const d = draftFor("restaurant");
    expect(d.convention).toBe("1979");
    expect(d.rules.maxHoursPerDay).toBe(11);
    expect(d.rules.maxAmplitudeHours).toBe(13);
    expect(stateFromDraft(d).establishment.convention).toBe("1979");
  });
  it("sans convention : limites du Code du travail (10 h par jour)", () => {
    expect(findConvention("code")!.rules.maxHoursPerDay).toBe(10);
    expect(draftFor("autre").rules.maxHoursPerDay).toBe(10);
  });
  it("chaque convention dit clairement ce qui est appliqué et ce qui est à vérifier", () => {
    for (const c of CONVENTIONS) {
      expect(c.applied.length, c.label).toBeGreaterThan(0);
      expect(c.toCheck.length, c.label).toBeGreaterThan(0);
      if (c.idcc !== "code") expect(c.idcc).toMatch(/^\d{3,4}$/);
    }
  });
});
