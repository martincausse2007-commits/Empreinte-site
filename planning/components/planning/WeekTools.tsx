"use client";

// Outils de la semaine : publication, régénération intelligente, demandes de
// l'équipe, chiffre d'affaires prévu / masse salariale, places vides expliquées.

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, CalendarCheck2, CalendarOff, Check, CircleDot, Euro, History, Inbox, Lock, RefreshCw, Scale, Send, X } from "lucide-react";
import { useApp } from "@/lib/store";
import type { Shift } from "@/lib/types";
import { snapshotOf, weekStatus } from "@/lib/publish";
import { laborOfWeek } from "@/lib/labor";
import { answerRequest, requestSummary, swapProblems } from "@/lib/requests";
import { explainUnfilled } from "@/lib/generate";
import { fairnessTable } from "@/lib/fairness";
import { DAYS, DAYS_SHORT } from "@/lib/time";
import { forWeek } from "@/lib/week";
import { Button, Card, Modal, buttonClass, cx, inputClass, useConfirm, useToast } from "../ui";

const euros = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €";
const pct = (r: number) => Math.round(r * 100) + " %";

// ---- Publication ------------------------------------------------------------

export function PublishBar({ week, shifts }: { week: string; shifts: Shift[] }) {
  const { state, update } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const meta = state.weekMeta?.[week];
  const { status, changes } = weekStatus(meta, shifts);
  if (!shifts.length) return null;

  async function publish() {
    if (status === "modified" && !(await confirm({ title: "Publier les changements ?", text: `${changes.length} changement${changes.length > 1 ? "s" : ""} depuis la dernière publication. L'équipe verra la nouvelle version sur le lien de partage.`, confirmLabel: "Publier" })))
      return;
    update(
      (s) => ({
        ...s,
        weekMeta: { ...s.weekMeta, [week]: { ...(s.weekMeta?.[week] ?? {}), status: "published", publishedAt: new Date().toISOString(), snapshot: snapshotOf(shifts), changes: s.weekMeta?.[week]?.changes ?? [] } },
      }),
      { record: true },
    );
    toast(status === "draft" ? "Planning publié : l'équipe peut le voir" : "Nouvelle version publiée");
  }

  const when = meta?.publishedAt ? new Date(meta.publishedAt).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "";
  return (
    <div
      className={cx(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-2.5",
        status === "draft" ? "border-slate-200 bg-white" : status === "modified" ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50",
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        {status === "draft" ? <CircleDot size={16} className="shrink-0 text-slate-500" /> : status === "modified" ? <History size={16} className="shrink-0 text-amber-700" /> : <CalendarCheck2 size={16} className="shrink-0 text-emerald-700" />}
        <span className="min-w-0">
          <span className="font-semibold">{status === "draft" ? "Brouillon" : status === "modified" ? "Modifié après publication" : "Publié"}</span>{" "}
          <span className="text-slate-600">
            {status === "draft"
              ? "· l'équipe ne voit rien tant que vous ne publiez pas."
              : status === "modified"
                ? `· ${changes.length} changement${changes.length > 1 ? "s" : ""} pas encore envoyé${changes.length > 1 ? "s" : ""} (publié le ${when}).`
                : `le ${when} · l'équipe voit cette version.`}
          </span>
        </span>
      </span>
      <span className="flex gap-2">
        {status !== "draft" && (
          <Link href="/partage" className={buttonClass("ghost", "sm")}>
            <History size={14} /> Historique
          </Link>
        )}
        {status !== "published" && (
          <Button size="sm" variant="primary" onClick={publish}>
            <Send size={14} /> {status === "draft" ? "Publier" : "Publier les changements"}
          </Button>
        )}
      </span>
    </div>
  );
}

// ---- Régénération -----------------------------------------------------------

export type RegenMode = { kind: "keep" } | { kind: "day"; day: number } | { kind: "all" };

export function RegenerateModal({ open, onClose, onRun, defaultDay, kept }: { open: boolean; onClose: () => void; onRun: (m: RegenMode) => void; defaultDay: number; kept: { locked: number; manual: number; people: number } }) {
  const [kind, setKind] = useState<RegenMode["kind"]>("keep");
  const [day, setDay] = useState(defaultDay);
  const opt = (k: RegenMode["kind"], title: string, text: string) => (
    <button
      type="button"
      onClick={() => setKind(k)}
      aria-pressed={kind === k}
      className={cx("w-full rounded-xl border p-3 text-left transition", kind === k ? "border-brand-600 bg-brand-50 ring-2 ring-brand-500/20" : "border-slate-200 hover:bg-slate-50")}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="block text-[13px] text-slate-600">{text}</span>
    </button>
  );
  const keptText = [kept.locked && `${kept.locked} verrouillé${kept.locked > 1 ? "s" : ""}`, kept.manual && `${kept.manual} modifié${kept.manual > 1 ? "s" : ""} à la main`, kept.people && `${kept.people} salarié${kept.people > 1 ? "s" : ""} verrouillé${kept.people > 1 ? "s" : ""}`].filter(Boolean).join(", ");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Régénérer la semaine"
      footer={
        <>
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={() => onRun(kind === "day" ? { kind, day } : { kind } as RegenMode)}>
            <RefreshCw size={15} /> Régénérer
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {opt("keep", "Refaire le reste", keptText ? `Garde vos créneaux à vous (${keptText}) et refait tout le reste.` : "Rien n'est verrouillé ni modifié à la main : tout sera refait. Astuce : un cadenas protège un créneau ou un salarié.")}
        {opt("day", "Refaire un seul jour", "Les autres jours ne bougent pas. Les créneaux verrouillés de ce jour sont gardés.")}
        {kind === "day" && (
          <div className="grid grid-cols-7 gap-1 px-1">
            {DAYS_SHORT.map((d, i) => (
              <button key={i} type="button" onClick={() => setDay(i)} className={cx("h-11 rounded-lg border text-[13px] font-medium", day === i ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 text-slate-600")}>
                {d}
              </button>
            ))}
          </div>
        )}
        {opt("all", "Tout refaire", "Repart de zéro, même les créneaux verrouillés ou faits à la main.")}
        <p className="pt-1 text-xs text-slate-500">Vous pourrez revenir en arrière avec « Annuler ».</p>
      </div>
    </Modal>
  );
}

// ---- Demandes de l'équipe ---------------------------------------------------

export function RequestsCard() {
  const { state, update } = useApp();
  const toast = useToast();
  const [all, setAll] = useState(false);
  const pending = (state.requests ?? []).filter((r) => r.status === "pending");
  if (!pending.length) return null;
  const shown = all ? pending : pending.slice(0, 2);
  const answer = (id: string, ok: boolean) => {
    update((s) => answerRequest(s, id, ok), { record: true });
    toast(ok ? "Demande acceptée" : "Demande refusée");
  };
  const Icon = { leave: CalendarOff, swap: ArrowLeftRight, availability: CalendarCheck2 };
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Inbox size={16} className="text-brand-700" /> {pending.length} demande{pending.length > 1 ? "s" : ""} de l&apos;équipe
      </div>
      <ul className="divide-y divide-slate-100">
        {shown.map((r) => {
          const I = Icon[r.type];
          const problems = r.type === "swap" ? swapProblems(state, r) : [];
          return (
            <li key={r.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
              <span className="flex min-w-0 flex-1 items-start gap-2.5 text-sm">
                <I size={16} className="mt-0.5 shrink-0 text-slate-500" />
                <span className="min-w-0">
                  <span className="block">{requestSummary(state, r)}</span>
                  {r.type === "swap" &&
                    (problems.length ? (
                      <span className="block text-xs font-medium text-red-700">Impossible tel quel : {problems.map((p) => p.title).join(" · ")}</span>
                    ) : (
                      <span className="block text-xs text-emerald-700">Vérifié : repos, heures et poste respectés.</span>
                    ))}
                  {r.type === "leave" && <span className="block text-xs text-slate-500">Accepter l&apos;ajoute aux absences : le planning en tiendra compte.</span>}
                  {r.type === "availability" && <span className="block text-xs text-slate-500">Accepter met à jour sa fiche pour les prochains plannings.</span>}
                </span>
              </span>
              <span className="flex shrink-0 gap-2 pl-6 sm:pl-0">
                <Button size="sm" onClick={() => answer(r.id, false)}>
                  <X size={14} /> Refuser
                </Button>
                <Button size="sm" variant="primary" disabled={problems.length > 0} onClick={() => answer(r.id, true)}>
                  <Check size={14} /> Accepter
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
      {pending.length > 2 && (
        <button onClick={() => setAll((v) => !v)} className="mt-1 min-h-11 w-full rounded-lg text-sm font-medium text-brand-700 hover:bg-brand-50 sm:min-h-9">
          {all ? "Réduire" : `Voir les ${pending.length - 2} autres demandes`}
        </button>
      )}
    </Card>
  );
}

// ---- Chiffre d'affaires prévu et masse salariale ----------------------------

export function LaborCard({ week, shifts }: { week: string; shifts: Shift[] }) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const l = laborOfWeek(state, week, shifts);
  const over = l.ratio !== null && l.ratio > l.target;
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", over ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700")}>
            <Euro size={18} />
          </span>
          <div className="min-w-0">
            {l.ratio === null ? (
              <>
                <div className="text-sm font-semibold">Masse salariale prévue : {euros(l.cost)}</div>
                <p className="text-sm text-slate-600">Saisissez le chiffre d&apos;affaires prévu pour voir le ratio en direct.</p>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold">
                  Masse salariale : {pct(l.ratio)} du CA prévu <span className={cx("font-normal", over ? "text-amber-800" : "text-emerald-700")}>(objectif {pct(l.target)})</span>
                </div>
                <p className="text-sm text-slate-600">
                  {euros(l.cost)} pour {euros(l.revenue ?? 0)} de CA prévu{l.withCharges ? ", charges comprises" : ", salaires bruts sans charges"}.
                  {l.missingRates > 0 && ` ${l.missingRates} salarié${l.missingRates > 1 ? "s" : ""} sans taux horaire (compté 0 €).`}
                </p>
              </>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          CA prévu par jour
        </Button>
      </div>
      {l.ratio !== null && (
        <div className="mt-3 grid grid-cols-7 gap-1 border-t border-slate-100 pt-3 text-center">
          {l.days.map((d, i) => (
            <div key={i} className="min-w-0">
              <div className="text-[11px] text-slate-500">{DAYS_SHORT[i]}</div>
              <div className={cx("text-[13px] font-semibold tabular-nums", d.ratio === null ? "text-slate-500" : d.ratio > l.target ? "text-amber-800" : "text-emerald-700")}>{d.ratio === null ? "—" : pct(d.ratio)}</div>
            </div>
          ))}
        </div>
      )}
      <RevenueModal open={open} onClose={() => setOpen(false)} week={week} shifts={shifts} />
    </Card>
  );
}

function RevenueModal({ open, onClose, week, shifts }: { open: boolean; onClose: () => void; week: string; shifts: Shift[] }) {
  const { state, update } = useApp();
  const l = laborOfWeek(state, week, shifts);
  const rev = state.weekMeta?.[week]?.revenue ?? [];
  const set = (d: number, v: string) => {
    const n = v === "" ? null : Math.max(0, Number(v.replace(",", ".")) || 0);
    update((s) => {
      const m = s.weekMeta?.[week] ?? { status: "draft" as const };
      const r = Array.from({ length: 7 }, (_, i) => (i === d ? n : (m.revenue?.[i] ?? null)));
      return { ...s, weekMeta: { ...s.weekMeta, [week]: { ...m, revenue: r } } };
    });
  };
  return (
    <Modal open={open} onClose={onClose} title="Chiffre d'affaires prévu" footer={<><div className="flex-1" /><Button variant="primary" onClick={onClose}>Terminé</Button></>}>
      <p className="mb-3 text-sm text-slate-600">Une estimation suffit. Le ratio se met à jour pendant que vous tapez. Laissez vide un jour fermé.</p>
      <div className="space-y-2">
        {DAYS.map((d, i) => (
          <label key={i} className="flex items-center gap-3">
            <span className="w-24 text-sm">{d}</span>
            <span className="relative flex-1">
              <input inputMode="decimal" className={cx(inputClass, "pr-8 text-right tabular-nums")} value={rev[i] ?? ""} placeholder="—" onChange={(e) => set(i, e.target.value)} aria-label={`CA prévu ${d}`} />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-slate-500">€</span>
            </span>
            <span className={cx("w-14 text-right text-sm font-semibold tabular-nums", l.days[i].ratio === null ? "text-slate-500" : l.days[i].ratio! > l.target ? "text-amber-800" : "text-emerald-700")}>
              {l.days[i].ratio === null ? "—" : pct(l.days[i].ratio!)}
            </span>
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Objectif et charges patronales : <Link href="/reglages" className="font-medium text-brand-700" onClick={onClose}>Réglages</Link>.
      </p>
    </Modal>
  );
}

// ---- Places vides expliquées ------------------------------------------------

export type EmptySlot = { day: number; serviceId?: string; postId?: string };

export function WhyEmptyModal({ slot, onClose, shifts, lockedEmployees, onAdd }: { slot: EmptySlot | null; onClose: () => void; shifts: Shift[]; lockedEmployees: string[]; onAdd: (day: number, serviceId: string, postId: string) => void }) {
  const { state } = useApp();
  if (!slot) return null;
  const st = forWeek(state, state.currentWeek);
  // Toutes les places manquantes du jour (ou seulement celle demandée)
  const holes = st.services.flatMap((sv) =>
    st.posts.flatMap((p) => {
      if (slot.serviceId && (sv.id !== slot.serviceId || p.id !== slot.postId)) return [];
      const lines = explainUnfilled(st, shifts, slot.day, sv.id, p.id, lockedEmployees);
      return lines.length ? [{ sv, p, lines }] : [];
    }),
  );
  return (
    <Modal open onClose={onClose} title={`Pourquoi personne ? — ${DAYS[slot.day]}`}>
      {holes.length === 0 ? (
        <p className="text-sm text-slate-600">Tout est couvert ce jour-là.</p>
      ) : (
        <div className="space-y-3">
          {holes.map(({ sv, p, lines }) => (
            <div key={sv.id + p.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <div className="mb-1 text-sm font-semibold">
                {sv.name} · {p.name}
              </div>
              <ul className="space-y-0.5 pl-5 text-[13px] text-slate-800">
                {lines.map((t, i) => (
                  <li key={i} className="list-disc">{t}</li>
                ))}
              </ul>
              <Button size="sm" className="mt-2" onClick={() => (onClose(), onAdd(slot.day, sv.id, p.id))}>
                Placer quelqu&apos;un quand même
              </Button>
            </div>
          ))}
          <p className="text-xs text-slate-500">Pistes : un extra, un renfort d&apos;un autre poste, ou baisser le besoin dans « Besoins ».</p>
        </div>
      )}
    </Modal>
  );
}

// ---- Équité -----------------------------------------------------------------

export function FairnessBadge({ week }: { week: string }) {
  const { state } = useApp();
  const f = fairnessTable(state, week);
  return (
    <Link
      href="/heures#equite"
      className={cx("inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium", f.level === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")}
      title="Week-ends, fermetures et coupures sur les dernières semaines"
    >
      <Scale size={13} /> {f.level === "ok" ? "Équité OK" : "Équité à surveiller"}
      {f.weeks > 0 && <span className="text-slate-500">· {f.weeks} sem.</span>}
    </Link>
  );
}

export function LockSummary({ locked, people }: { locked: number; people: number }) {
  if (!locked && !people) return null;
  return (
    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-xs font-medium text-slate-700">
      <Lock size={12} /> {[locked && `${locked} créneau${locked > 1 ? "x" : ""}`, people && `${people} salarié${people > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}
    </span>
  );
}

