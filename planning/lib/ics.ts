// Fichier agenda (.ics) des créneaux d'un salarié : s'importe dans Google Agenda,
// Apple Calendrier ou Outlook. Heures « flottantes » (heure locale du commerce).

import type { Shift } from "./types";
import { dateOfDay } from "./time";

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

function stamp(week: string, day: number, hhmm: string, nextDay = false) {
  const d = dateOfDay(week, day);
  if (nextDay) d.setDate(d.getDate() + 1);
  return `${ymd(d)}T${hhmm.replace(":", "")}00`;
}

/** Plie les lignes à 75 caractères comme le demande le format iCalendar. */
function fold(line: string) {
  const out: string[] = [];
  for (let i = 0; i < line.length; i += 73) out.push((i ? " " : "") + line.slice(i, i + 73));
  return out.join("\r\n");
}

export function icsFor(opts: { establishment: string; weeks: { week: string; shifts: Shift[] }[]; postName: (id: string) => string; now?: Date }): string {
  const now = opts.now ?? new Date();
  const dtstamp = `${ymd(now)}T${pad(now.getHours())}${pad(now.getMinutes())}00`;
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Quinzo//Planning//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${esc(`Planning ${opts.establishment}`)}`];
  for (const { week, shifts } of opts.weeks)
    for (const s of shifts) {
      const overnight = s.end <= s.start; // fin après minuit
      lines.push(
        "BEGIN:VEVENT",
        `UID:${s.id}-${week}@quinzo`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${stamp(week, s.day, s.start)}`,
        `DTEND:${stamp(week, s.day, s.end === "00:00" ? "23:59" : s.end, overnight && s.end !== "00:00")}`,
        `SUMMARY:${esc(`${opts.postName(s.postId)} · ${opts.establishment}`)}`,
        ...(s.breakMinutes ? [`DESCRIPTION:${esc(`Pause ${s.breakMinutes} min`)}`] : []),
        "END:VEVENT",
      );
    }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
