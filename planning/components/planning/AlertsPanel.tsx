"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Moon, UserX, Users, CalendarX, Layers } from "lucide-react";
import type { Alert, AlertKind } from "@/lib/rules";
import { ALERT_LABELS } from "@/lib/rules";
import { cx } from "../ui";

const ICONS: Record<AlertKind, typeof Clock> = {
  hours: Clock,
  rest: Moon,
  restDays: CalendarX,
  unavailable: UserX,
  overlap: Layers,
  uncovered: Users,
};

export function AlertsPanel({ alerts, onSelect }: { alerts: Alert[]; onSelect?: (a: Alert) => void }) {
  const [open, setOpen] = useState(false);

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <CheckCircle2 size={18} className="shrink-0" />
        <span>
          <span className="font-semibold">Tout est en règle.</span> Contrats, repos et couverture respectés.
        </span>
      </div>
    );
  }

  const errors = alerts.filter((a) => a.severity === "error").length;
  const kinds = [...new Set(alerts.map((a) => a.kind))];

  return (
    <div className={cx("overflow-hidden rounded-xl border", errors ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/70")}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-left">
        <span className={cx("flex items-center gap-2 text-sm font-semibold", errors ? "text-red-800" : "text-amber-900")}>
          <AlertTriangle size={18} />
          {alerts.length} alerte{alerts.length > 1 ? "s" : ""}
        </span>
        <span className="flex flex-1 flex-wrap gap-1.5">
          {kinds.map((k) => {
            const Icon = ICONS[k];
            const n = alerts.filter((a) => a.kind === k).length;
            const err = alerts.find((a) => a.kind === k)?.severity === "error";
            return (
              <span
                key={k}
                className={cx(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  err ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800",
                )}
              >
                <Icon size={12} />
                {ALERT_LABELS[k]} · {n}
              </span>
            );
          })}
        </span>
        <ChevronDown size={18} className={cx("text-slate-500 transition", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="max-h-72 divide-y divide-black/5 overflow-y-auto border-t border-black/5 bg-white/70">
          {alerts.map((a) => {
            const Icon = ICONS[a.kind];
            return (
              <li key={a.id}>
                <button onClick={() => onSelect?.(a)} className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-white">
                  <Icon size={16} className={cx("mt-0.5 shrink-0", a.severity === "error" ? "text-red-600" : "text-amber-600")} />
                  <span>
                    <span className="block text-sm font-medium">{a.title}</span>
                    <span className="block text-xs text-slate-500">{a.detail}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
