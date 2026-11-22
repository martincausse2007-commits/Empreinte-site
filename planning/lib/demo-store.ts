// Démo de départ : deux établissements, pour montrer qu'un gérant peut en avoir plusieurs.
import type { AppState } from "./types";
import { createDemoState, STATE_VERSION } from "./demo-data";
import { draftFor, exampleTeam, stateFromDraft } from "./setup";
import { generateWeek } from "./generate";
import { addWeeks } from "./time";

export function createDemoBoutique(): AppState {
  const d = draftFor("boutique", "Maison Lumen");
  d.employees = exampleTeam(d);
  const s = stateFromDraft(d);
  const prev = addWeeks(s.currentWeek, -1);
  return { ...s, plans: { [prev]: generateWeek({ ...s, currentWeek: prev }).shifts, [s.currentWeek]: [] } };
}

export function createDemoStore() {
  return { version: STATE_VERSION, active: "d1", items: { d1: createDemoState(), d2: createDemoBoutique() } as Record<string, AppState> };
}
