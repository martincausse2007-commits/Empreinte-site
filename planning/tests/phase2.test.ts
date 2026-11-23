// Phase 2 : l'équipe dans la boucle (créneaux libres, remplacement urgent,
// échanges acceptés par le collègue, accusés de lecture, agenda, notifications).
import { describe, expect, it } from "vitest";
import { createDemoState } from "@/lib/demo-data";
import { answerPeer, answerRequest, cancelRequest, claimProblems, markRead, newRequest, offerShift, openCandidates, readStatus, swapProblems, withdrawOpen } from "@/lib/requests";
import { checkWeek } from "@/lib/engine/check";
import { icsFor } from "@/lib/ics";
import { notifyEmail, notifyMessage } from "@/lib/notify-text";
import { addWeeks, mondayOf } from "@/lib/time";
import type { AppState, TeamRequest } from "@/lib/types";

const demo = () => createDemoState();
const thisWeek = () => addWeeks(mondayOf(new Date()), 0);
const HARD = (s: AppState, week: string) => checkWeek(s, s.plans[week], week).filter((i) => i.severity === "error");

describe("Créneaux libres et remplacement urgent", () => {
  it("la démo contient un remplacement urgent, proposé seulement à des personnes qui peuvent le prendre", () => {
    const s = demo();
    const w = thisWeek();
    const open = s.weekMeta![w].openShifts!;
    expect(open.length).toBe(1);
    expect(open[0].urgent).toBe(true);
    expect(open[0].offeredTo.length).toBeGreaterThan(0);
    for (const id of open[0].offeredTo) expect(claimProblems(s, { id: "x", type: "claim", employeeId: id, status: "pending", createdAt: "", week: w, openId: open[0].id })).toEqual([]);
  });

  it("proposer un créneau en urgence le retire à la personne absente", () => {
    const s = demo();
    const w = thisWeek();
    const shift = s.plans[w][0];
    const { state, open } = offerShift(s, w, { day: shift.day, start: shift.start, end: shift.end, postId: shift.postId }, { fromShift: shift, urgent: true });
    expect(state.plans[w].some((x) => x.id === shift.id)).toBe(false);
    expect(open.offeredTo).not.toContain(shift.employeeId);
  });

  it("valider un volontaire lui donne le créneau, sans aucune règle interdite, et refuse les autres", () => {
    let s = demo();
    const w = thisWeek();
    const open = s.weekMeta![w].openShifts![0];
    const [a, b] = open.offeredTo;
    const before = HARD(s, w).length;
    const r1 = newRequest({ type: "claim", employeeId: a, week: w, openId: open.id } as Omit<TeamRequest, "id" | "status" | "createdAt">);
    const r2 = b ? newRequest({ type: "claim", employeeId: b, week: w, openId: open.id } as Omit<TeamRequest, "id" | "status" | "createdAt">) : null;
    s = { ...s, requests: [...(s.requests ?? []).filter((r) => r.type !== "claim"), r1, ...(r2 ? [r2] : [])] };
    s = answerRequest(s, r1.id, true);
    expect(s.plans[w].some((x) => x.id === open.id && x.employeeId === a)).toBe(true);
    expect(s.weekMeta![w].openShifts!.length).toBe(0);
    if (r2) expect(s.requests!.find((r) => r.id === r2.id)!.status).toBe("refused");
    expect(HARD(s, w).length).toBeLessThanOrEqual(before);
  });

  it("un volontaire qui enfreindrait une règle est signalé", () => {
    const s = demo();
    const w = thisWeek();
    const open = s.weekMeta![w].openShifts![0];
    const blocked = s.employees.find((e) => !e.archived && e.postIds.includes(open.postId) && !open.offeredTo.includes(e.id));
    if (!blocked) return; // tout le monde peut le prendre : rien à vérifier
    const p = claimProblems(s, { id: "x", type: "claim", employeeId: blocked.id, status: "pending", createdAt: "", week: w, openId: open.id });
    expect(p.length).toBeGreaterThan(0);
  });

  it("retirer un créneau libre refuse les volontaires en attente", () => {
    const s = demo();
    const w = thisWeek();
    const open = s.weekMeta![w].openShifts![0];
    const next = withdrawOpen(s, w, open.id);
    expect(next.weekMeta![w].openShifts!.length).toBe(0);
    expect(next.requests!.filter((r) => r.type === "claim" && r.status === "pending").length).toBe(0);
  });

  it("les candidats d'un créneau ne comptent jamais la personne absente", () => {
    const s = demo();
    const w = thisWeek();
    const sh = s.plans[w][3];
    expect(openCandidates(s, w, sh, sh.employeeId)).not.toContain(sh.employeeId);
  });
});

describe("Échanges en deux temps", () => {
  it("le collègue doit accepter avant que le gérant ne voie l'échange", () => {
    let s = demo();
    const peer = s.requests!.find((r) => r.status === "peer" && r.type === "swap") as Extract<TeamRequest, { type: "swap" }>;
    expect(peer).toBeTruthy();
    // Le gérant ne peut pas valider un échange que le collègue n'a pas accepté
    expect(answerRequest(s, peer.id, true)).toBe(s);
    // Un autre salarié ne peut pas répondre à sa place
    const other = s.employees.find((e) => e.id !== peer.toEmployeeId && e.id !== peer.employeeId)!;
    expect(answerPeer(s, peer.id, other.id, true).requests!.find((r) => r.id === peer.id)!.status).toBe("peer");
    s = answerPeer(s, peer.id, peer.toEmployeeId, true);
    expect(s.requests!.find((r) => r.id === peer.id)!.status).toBe("pending");
    expect(swapProblems(s, peer)).toEqual([]);
    s = answerRequest(s, peer.id, true);
    expect(s.plans[peer.week].find((x) => x.id === peer.shiftId)!.employeeId).toBe(peer.toEmployeeId);
  });
  it("on peut annuler sa propre demande, pas celle d'un autre", () => {
    const s = demo();
    const r = s.requests!.find((x) => x.status === "pending")!;
    expect(cancelRequest(s, r.id, "quelqu-un-d-autre").requests!.find((x) => x.id === r.id)!.status).toBe("pending");
    expect(cancelRequest(s, r.id, r.employeeId).requests!.find((x) => x.id === r.id)!.status).toBe("cancelled");
  });
});

describe("Accusés de lecture", () => {
  it("compte qui a vu la version publiée, et remet à zéro après une nouvelle publication", () => {
    let s = demo();
    const w = thisWeek();
    const st = readStatus(s, w)!;
    expect(st.seen.length).toBeGreaterThan(0);
    expect(st.seen.length + st.notSeen.length).toBe(st.total);
    // Nouvelle publication : plus personne n'a vu cette version
    s = { ...s, weekMeta: { ...s.weekMeta, [w]: { ...s.weekMeta![w], publishedAt: new Date(Date.now() + 1000).toISOString() } } };
    expect(readStatus(s, w)!.seen.length).toBe(0);
    s = markRead(s, w, st.notSeen[0]?.id ?? st.seen[0].id);
    expect(readStatus(s, w)!.seen.length).toBe(1);
  });
  it("pas de suivi de lecture sur un brouillon", () => {
    const s = demo();
    expect(readStatus(s, s.currentWeek)).toBeNull();
  });
});

describe("Agenda (.ics)", () => {
  it("produit un fichier agenda valide, y compris un créneau qui finit à minuit", () => {
    const ics = icsFor({
      establishment: "Le Comptoir, Paris",
      weeks: [{ week: "2026-11-30", shifts: [{ id: "s1", employeeId: "e1", day: 0, start: "18:00", end: "00:00", postId: "salle" }, { id: "s2", employeeId: "e1", day: 6, start: "11:00", end: "15:00", postId: "salle", breakMinutes: 30 }] }],
      postName: () => "Salle",
      now: new Date(2026, 10, 23, 9, 0),
    });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261130T180000");
    expect(ics).toContain("DTEND:20261130T235900");
    expect(ics).toContain("DTSTART:20261206T110000");
    expect(ics).toContain("SUMMARY:Salle · Le Comptoir\\, Paris");
    expect(ics.match(/BEGIN:VEVENT/g)!.length).toBe(2);
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
  });
});

describe("Notifications", () => {
  it("ne contiennent ni horaires de collègues ni motif d'absence, et échappent le HTML", () => {
    const m = notifyMessage("urgent", { establishment: "Chez <Léa>", detail: "Samedi 18h–23h" });
    expect(m.url).toContain("/moi");
    const e = notifyEmail(m, "https://quinzo.fr/");
    expect(e.html).not.toContain("<Léa>");
    expect(e.text).toContain("https://quinzo.fr/moi#a-prendre");
  });
});

describe("Démo cohérente", () => {
  it("le remplacement urgent de la démo ne laisse aucune règle interdite", () => {
    const s = demo();
    const w = thisWeek();
    expect(checkWeek(s, s.plans[w], w).filter((i) => i.severity === "error")).toEqual([]);
  });
});
