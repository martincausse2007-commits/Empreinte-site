// Prévenir l'équipe depuis l'écran du gérant. En démo : rien n'est envoyé (simulation).

import type { NotifyKind } from "./notify-text";

export type NotifyResult = { push: number; email: number; people: number; simulated?: boolean; error?: string };

export async function notifyTeam(mode: "demo" | "cloud" | "loading", p: { establishmentId: string | null; kind: NotifyKind; employeeIds: string[]; weekLabel?: string; detail?: string; accepted?: boolean }): Promise<NotifyResult> {
  if (!p.employeeIds.length) return { push: 0, email: 0, people: 0 };
  if (mode !== "cloud" || !p.establishmentId) return { push: 0, email: 0, people: p.employeeIds.length, simulated: true };
  try {
    const r = await fetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
    const data = await r.json();
    if (!r.ok) return { push: 0, email: 0, people: 0, error: data.error ?? "Envoi impossible" };
    return data;
  } catch {
    return { push: 0, email: 0, people: 0, error: "Envoi impossible (réseau)" };
  }
}

/** Phrase simple pour le gérant après un envoi. */
export function notifySummary(r: NotifyResult): string {
  if (r.error) return `Notifications non envoyées : ${r.error}`;
  if (r.simulated) return `Démo : ${r.people} personne${r.people > 1 ? "s" : ""} seraient prévenue${r.people > 1 ? "s" : ""} (rien n'est envoyé)`;
  const sent = r.push + r.email;
  if (!sent) return "Personne n'a encore activé les notifications : pensez à WhatsApp";
  return `Équipe prévenue : ${r.push} notification${r.push > 1 ? "s" : ""}${r.email ? `, ${r.email} e-mail${r.email > 1 ? "s" : ""}` : ""}`;
}
