// Masse salariale prévue et ratio sur le chiffre d'affaires prévu (saisi à la main).

import type { AppState, Shift } from "./types";
import { rulesOf, shiftHours } from "./rules";

export type LaborDay = { cost: number; revenue: number | null; ratio: number | null };

export function laborOfWeek(state: AppState, week: string, shifts: Shift[]) {
  const rules = rulesOf(state);
  const charges = 1 + (rules.employerChargesPercent ?? 0) / 100;
  const rate = (id: string) => state.employees.find((e) => e.id === id)?.hourlyRate;
  const revenue = state.weekMeta?.[week]?.revenue ?? [];
  const days: LaborDay[] = Array.from({ length: 7 }, (_, d) => {
    const cost = shifts.filter((s) => s.day === d).reduce((a, s) => a + shiftHours(s) * (rate(s.employeeId) ?? 0) * charges, 0);
    const rev = revenue[d] ?? null;
    return { cost, revenue: rev, ratio: rev ? cost / rev : null };
  });
  const cost = days.reduce((a, d) => a + d.cost, 0);
  const rev = days.reduce((a, d) => a + (d.revenue ?? 0), 0);
  const missingRates = new Set(shifts.filter((s) => rate(s.employeeId) === undefined).map((s) => s.employeeId)).size;
  return { days, cost, revenue: rev || null, ratio: rev ? cost / rev : null, target: (rules.laborTargetPercent ?? 30) / 100, missingRates, withCharges: charges > 1 };
}
