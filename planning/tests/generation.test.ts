// Le questionnaire + la génération doivent couvrir tous les besoins, pour chaque activité.
import { describe, expect, it } from "vitest";
import { ACTIVITIES } from "@/lib/presets";
import { draftFor, exampleTeam, stateFromDraft } from "@/lib/setup";
import { generateWeek } from "@/lib/generate";
import { coverage } from "@/lib/rules";
import { createDemoState } from "@/lib/demo-data";

describe("Génération de la semaine", () => {
  for (const a of ACTIVITIES) {
    it(`${a.label} : tous les postes sont couverts avec l'équipe d'exemple`, () => {
      const d = draftFor(a.id);
      d.employees = exampleTeam(d);
      const state = stateFromDraft(d);
      const res = generateWeek(state);
      expect(res.unfilled).toBe(0);
      expect(coverage(state, res.shifts).every((c) => c.assigned >= c.needed)).toBe(true);
    });
  }

  it("la démo du restaurant est entièrement couverte", () => {
    const s = createDemoState();
    expect(generateWeek(s).unfilled).toBe(0);
  });
});
