// Publication d'une semaine et changements faits ensuite (pour l'historique,
// le délai de prévenance et le message WhatsApp « seulement ce qui a changé »).

import type { AppState, Shift, WeekMeta } from "./types";
import { DAYS, formatTime } from "./time";

export type DayChange = { employeeId: string; day: number; before: string; after: string };

const sig = (s: Shift) => `${s.start}|${s.end}|${s.postId}`;
/** « 11h–15h + 18h–23h », ou « repos ». */
export function dayLabel(list: Shift[]) {
  if (!list.length) return "repos";
  return [...list]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((s) => `${formatTime(s.start)}–${formatTime(s.end)}`)
    .join(" + ");
}

/** Différences jour par jour, salarié par salarié, entre deux versions d'une semaine. */
export function diffWeek(before: Shift[], after: Shift[]): DayChange[] {
  const out: DayChange[] = [];
  const people = new Set([...before, ...after].map((s) => s.employeeId));
  for (const id of people)
    for (let d = 0; d < 7; d++) {
      const b = before.filter((s) => s.employeeId === id && s.day === d);
      const a = after.filter((s) => s.employeeId === id && s.day === d);
      const kb = b.map(sig).sort().join(",");
      const ka = a.map(sig).sort().join(",");
      if (kb !== ka) out.push({ employeeId: id, day: d, before: dayLabel(b), after: dayLabel(a) });
    }
  return out.sort((x, y) => x.day - y.day);
}

export function changeText(c: DayChange) {
  return `${DAYS[c.day]} : ${c.after === "repos" ? "repos" : c.after} (avant : ${c.before})`;
}

export type WeekStatus = "draft" | "published" | "modified";

export function weekStatus(meta: WeekMeta | undefined, current: Shift[]): { status: WeekStatus; changes: DayChange[] } {
  if (!meta || meta.status !== "published" || !meta.snapshot) return { status: "draft", changes: [] };
  const changes = diffWeek(meta.snapshot, current);
  return { status: changes.length ? "modified" : "published", changes };
}

/** Copie propre pour la publication (sans les explications internes). */
export function snapshotOf(shifts: Shift[]): Shift[] {
  return shifts.map(({ reason: _r, ...s }) => s); // eslint-disable-line @typescript-eslint/no-unused-vars
}

/** Message WhatsApp ne listant que ce qui a changé depuis la publication, et pour qui. */
export function whatsappChanges(state: AppState, week: string, changes: DayChange[], weekLabel: string, link?: string): string {
  const name = (id: string) => state.employees.find((e) => e.id === id)?.firstName ?? "?";
  const lines = [`🔁 *Planning ${state.establishment.name} : changements*`, `Semaine du ${weekLabel}`, ""];
  const byPerson = new Map<string, DayChange[]>();
  for (const c of changes) byPerson.set(c.employeeId, [...(byPerson.get(c.employeeId) ?? []), c]);
  for (const [id, list] of byPerson) {
    lines.push(`*${name(id)}*`);
    for (const c of list) lines.push(`${DAYS[c.day]} : ${c.after === "repos" ? "repos" : c.after}  _(avant : ${c.before})_`);
    lines.push("");
  }
  lines.push("Les autres horaires ne changent pas.");
  if (link) lines.push(`👉 Planning complet : ${link}`);
  return lines.join("\n");
}

