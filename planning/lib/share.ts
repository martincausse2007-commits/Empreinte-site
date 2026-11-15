import type { AppState, Shift } from "./types";
import { hoursByEmployee, shiftCoversService } from "./rules";
import { DAYS, DAYS_SHORT, formatDayDate, formatHours, formatTime, formatWeekRange } from "./time";

/** Texte prêt à coller dans WhatsApp (*gras* = gras dans WhatsApp). */
export function whatsappText(state: AppState, week: string, shifts: Shift[], mode: "day" | "person", link?: string): string {
  const lines: string[] = [`📅 *Planning ${state.establishment.name}*`, `Semaine du ${formatWeekRange(week)}`, ""];
  const name = (id: string) => state.employees.find((e) => e.id === id)?.firstName ?? "?";

  if (mode === "day") {
    for (let d = 0; d < 7; d++) {
      const day = shifts.filter((s) => s.day === d);
      lines.push(`*${DAYS[d]} ${formatDayDate(week, d)}*`);
      if (!day.length) {
        lines.push("Fermé", "");
        continue;
      }
      const used = new Set<string>();
      for (const sv of state.services) {
        const list = day.filter((s) => !used.has(s.id) && shiftCoversService(s, sv));
        if (!list.length) continue;
        list.forEach((s) => used.add(s.id));
        const byPost = state.posts
          .map((p) => {
            const names = list.filter((s) => s.postId === p.id).map((s) => name(s.employeeId) + (s.start !== sv.start || s.end !== sv.end ? ` (${formatTime(s.start)}-${formatTime(s.end)})` : ""));
            return names.length ? `${p.name} : ${names.join(", ")}` : null;
          })
          .filter(Boolean);
        lines.push(`${sv.name} ${formatTime(sv.start)}-${formatTime(sv.end)}`, ...byPost.map((b) => `  • ${b}`));
      }
      const rest = day.filter((s) => !used.has(s.id));
      if (rest.length) lines.push(...rest.map((s) => `  • ${name(s.employeeId)} ${formatTime(s.start)}-${formatTime(s.end)}`));
      lines.push("");
    }
  } else {
    const hours = hoursByEmployee(shifts);
    for (const e of state.employees) {
      const mine = shifts.filter((s) => s.employeeId === e.id).sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
      lines.push(`*${e.firstName}* — ${formatHours(hours[e.id] ?? 0)}`);
      if (!mine.length) lines.push("Repos toute la semaine");
      for (let d = 0; d < 7; d++) {
        const s = mine.filter((x) => x.day === d);
        if (s.length) lines.push(`${DAYS_SHORT[d]} : ${s.map((x) => `${formatTime(x.start)}-${formatTime(x.end)}`).join(" + ")}`);
      }
      lines.push("");
    }
  }
  if (link) lines.push(`👉 Planning en ligne : ${link}`);
  return lines.join("\n").trim();
}
