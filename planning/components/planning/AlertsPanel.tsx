"use client";

// Bandeau d'alertes. « Tout est en règle » n'apparaît que si le module de
// vérification ne trouve RIEN, ni interdit (rouge) ni point à vérifier (ambre).
// Chaque ligne est cliquable : elle amène à la case concernée.

import { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  BedDouble,
  CalendarX,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coffee,
  Hourglass,
  Layers,
  Moon,
  Scissors,
  Shuffle,
  Sun,
  UserX,
  Users,
  Briefcase,
  CalendarOff,
  BellRing,
} from "lucide-react";
import { ISSUE_LABELS, type Issue, type IssueKind } from "@/lib/engine/check";
import { cx } from "../ui";

const ICONS: Record<IssueKind, typeof Clock> = {
  unavailable: UserX,
  overlap: Layers,
  dailyRest: Moon,
  weeklyRest: BedDouble,
  restDays: CalendarX,
  consecutiveRest: Shuffle,
  dayHours: Hourglass,
  weekHours: Hourglass,
  amplitude: Hourglass,
  split: Scissors,
  pause: Coffee,
  contractOver: Clock,
  overtime: Clock,
  contractUnder: Clock,
  offPost: Briefcase,
  weekend: Sun,
  uncovered: Users,
  absence: CalendarOff,
  notice: BellRing,
};

export function AlertsPanel({ alerts, onSelect }: { alerts: Issue[]; onSelect?: (a: Issue) => void }) {
  const errors = alerts.filter((a) => a.severity === "error");
  const warnings = alerts.filter((a) => a.severity === "warning");
  const [open, setOpen] = useState(errors.length > 0);
  // Une nouvelle erreur apparaît (ex. après un déplacement) : on déplie le détail
  const [lastErrors, setLastErrors] = useState(errors.length);
  if (errors.length !== lastErrors) {
    setLastErrors(errors.length);
    if (errors.length > lastErrors) setOpen(true);
  }

  if (alerts.length === 0) {
    return (
      <div role="status" className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <CheckCircle2 size={18} className="shrink-0 text-emerald-700" />
        <span>
          <span className="font-semibold">Tout est en règle.</span> Contrats, repos, pauses, coupures et couverture vérifiés.
        </span>
      </div>
    );
  }

  const kinds = [...new Set(alerts.map((a) => a.kind))];
  return (
    <div className={cx("overflow-hidden rounded-xl border bg-white", errors.length ? "border-red-300" : "border-amber-300")}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cx("flex min-h-11 w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-left", errors.length ? "bg-red-50" : "bg-amber-50")}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          {errors.length > 0 && (
            <span className="flex items-center gap-1.5 text-red-800">
              <AlertOctagon size={18} className="text-red-600" />
              {errors.length} à corriger
            </span>
          )}
          {errors.length > 0 && warnings.length > 0 && <span className="text-slate-500">·</span>}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1.5 text-amber-900">
              <AlertTriangle size={17} className="text-amber-700" />
              {warnings.length} à vérifier
            </span>
          )}
        </span>
        <span className="hidden flex-1 flex-wrap gap-1.5 sm:flex">
          {kinds.map((k) => {
            const Icon = ICONS[k];
            const n = alerts.filter((a) => a.kind === k).length;
            const err = alerts.some((a) => a.kind === k && a.severity === "error");
            return (
              <span key={k} className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", err ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900")}>
                <Icon size={12} />
                {ISSUE_LABELS[k]} · {n}
              </span>
            );
          })}
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs font-medium text-slate-600">
          {open ? "Masquer" : "Voir le détail"}
          <ChevronDown size={16} className={cx("transition", open && "rotate-180")} />
        </span>
      </button>
      {open && (
        <div className="max-h-96 overflow-y-auto border-t border-slate-100">
          <Group title="À corriger — interdit" items={errors} tone="error" onSelect={onSelect} />
          <Group title="À vérifier — préférences et points d'attention" items={warnings} tone="warning" onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}

function Group({ title, items, tone, onSelect }: { title: string; items: Issue[]; tone: "error" | "warning"; onSelect?: (a: Issue) => void }) {
  if (!items.length) return null;
  return (
    <div>
      <div className={cx("px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide uppercase", tone === "error" ? "text-red-800" : "text-amber-900")}>{title}</div>
      <ul className="divide-y divide-slate-100">
        {items.map((a) => {
          const Icon = ICONS[a.kind];
          return (
            <li key={a.id}>
              <button onClick={() => onSelect?.(a)} className="flex min-h-11 w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
                <Icon size={16} className={cx("mt-0.5 shrink-0", tone === "error" ? "text-red-600" : "text-amber-700")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    <span className="sr-only">{tone === "error" ? "Interdit : " : "À vérifier : "}</span>
                    {a.title}
                  </span>
                  <span className="block text-xs text-slate-600">{a.detail}</span>
                </span>
                <span className="mt-0.5 shrink-0 text-xs font-medium text-brand-700">Voir</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
