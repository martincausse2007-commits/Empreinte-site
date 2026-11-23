"use client";

// Compteurs d'heures par salarié (semaine ou mois), coût estimé et export pour le comptable.

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileSpreadsheet, FileText, Scale } from "lucide-react";
import { fairnessTable } from "@/lib/fairness";
import { useApp } from "@/lib/store";
import { MONTHS_FR, monthCounters, weekCounters, type Counter } from "@/lib/counters";
import { download, monthSheet, toCSV, toXlsx } from "@/lib/export";
import { ABSENCE_TYPES } from "@/lib/absences";
import { addWeeks, formatHours, formatWeekRange, parseISODate } from "@/lib/time";
import type { AbsenceType } from "@/lib/types";
import { Avatar, Button, Card, PageHeader, cx, useToast } from "@/components/ui";
import { HoursMeter } from "@/components/planning/HoursMeter";

const euros = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function HoursPage() {
  const { state, ready } = useApp();
  const toast = useToast();
  const [mode, setMode] = useState<"week" | "month">("week");
  const [week, setWeek] = useState(state.currentWeek);
  const start = parseISODate(state.currentWeek);
  const [ym, setYm] = useState({ y: start.getFullYear(), m: start.getMonth() });

  const counters = useMemo(() => (mode === "week" ? weekCounters(state, week) : monthCounters(state, ym.y, ym.m)), [mode, state, week, ym]);
  const totals = counters.reduce(
    (a, c) => ({ planned: a.planned + c.planned, expected: a.expected + c.expected, extra: a.extra + c.extra, cost: a.cost + (c.cost ?? 0) }),
    { planned: 0, expected: 0, extra: 0, cost: 0 },
  );
  const hasCost = counters.some((c) => c.cost !== undefined);
  const periodLabel = mode === "week" ? formatWeekRange(week) : `${MONTHS_FR[ym.m]} ${ym.y}`;
  const move = (n: number) => (mode === "week" ? setWeek(addWeeks(week, n)) : setYm(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 })));

  function exportMonth(kind: "xlsx" | "csv") {
    const sheet = monthSheet(state, ym.y, ym.m);
    const base = `heures-${MONTHS_FR[ym.m]}-${ym.y}-${state.establishment.name}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    if (kind === "csv") download(`${base}.csv`, toCSV(sheet), "text/csv;charset=utf-8");
    else download(`${base}.xlsx`, toXlsx(sheet), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    toast("Export téléchargé");
  }

  if (!ready) return null;
  return (
    <div>
      <PageHeader title="Heures" subtitle="Compteurs par salarié, d'après le planning. Estimation indicative, à vérifier avant la paie." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="grid grid-cols-2 rounded-xl bg-slate-200/60 p-1" role="group" aria-label="Période">
          {(["week", "month"] as const).map((m) => (
            <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)} className={cx("min-h-11 rounded-lg px-4 text-sm font-medium sm:min-h-9", mode === m ? "bg-white shadow-sm" : "text-slate-600")}>
              {m === "week" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
        <div className="flex items-center rounded-xl border border-slate-200 bg-white">
          <button onClick={() => move(-1)} aria-label="Période précédente" className="flex h-11 w-11 items-center justify-center text-slate-600">
            <ChevronLeft size={18} />
          </button>
          <span className={cx("min-w-36 text-center text-sm font-semibold", mode === "month" && "capitalize")}>{periodLabel}</span>
          <button onClick={() => move(1)} aria-label="Période suivante" className="flex h-11 w-11 items-center justify-center text-slate-600">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Heures planifiées" value={formatHours(totals.planned)} sub={`pour ${formatHours(totals.expected)} à planifier`} />
        <Stat label="Heures sup / complémentaires estimées" value={formatHours(totals.extra)} sub="au-delà des heures à planifier, semaine par semaine" />
        <Stat label="Masse salariale estimée" value={hasCost ? euros(totals.cost) : "—"} sub={hasCost ? "brut, hors charges et majorations · visible par vous seul" : "renseignez un taux horaire dans les fiches"} />
      </div>

      {/* Ordinateur : tableau */}
      <Card className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-600">
              <th className="px-4 py-2.5 font-medium">Salarié</th>
              <th className="px-3 py-2.5 font-medium">Planifié / à planifier</th>
              <th className="px-3 py-2.5 text-right font-medium">Écart</th>
              <th className="px-3 py-2.5 text-right font-medium">Sup. estimées</th>
              <th className="px-3 py-2.5 text-right font-medium">Dimanches</th>
              <th className="px-3 py-2.5 text-right font-medium">Fériés</th>
              <th className="px-3 py-2.5 font-medium">Absences</th>
              {hasCost && <th className="px-4 py-2.5 text-right font-medium">Coût estimé</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {counters.map((c) => (
              <tr key={c.employee.id}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5">
                    <Avatar id={c.employee.id} name={`${c.employee.firstName} ${c.employee.lastName}`} size={28} />
                    <span className="font-medium">
                      {c.employee.firstName} {c.employee.lastName}
                    </span>
                  </span>
                </td>
                <td className="w-56 px-3 py-3">
                  <HoursMeter hours={c.planned} contract={Math.round(c.expected * 10) / 10} compact />
                </td>
                <td className={cx("px-3 py-3 text-right tabular-nums", Math.abs(c.planned - c.expected) > 0.5 && "font-semibold")}>{signed(c.planned - c.expected)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{c.extra > 0.01 ? formatHours(c.extra) : "—"}</td>
                <td className="px-3 py-3 text-right tabular-nums">{c.sundays || "—"}</td>
                <td className="px-3 py-3 text-right tabular-nums">{c.holidays || "—"}</td>
                <td className="px-3 py-3 text-slate-700">{absLabel(c) || "—"}</td>
                {hasCost && <td className="px-4 py-3 text-right tabular-nums">{c.cost !== undefined ? euros(c.cost) : "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Téléphone : une carte par personne */}
      <div className="space-y-2 md:hidden">
        {counters.map((c) => (
          <Card key={c.employee.id} className="p-4">
            <div className="mb-2 flex items-center gap-2.5">
              <Avatar id={c.employee.id} name={`${c.employee.firstName} ${c.employee.lastName}`} size={28} />
              <span className="flex-1 font-medium">{c.employee.firstName}</span>
              <span className="text-sm tabular-nums">{signed(c.planned - c.expected)}</span>
            </div>
            <HoursMeter hours={c.planned} contract={Math.round(c.expected * 10) / 10} compact />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
              {c.extra > 0.01 && <span>Sup. : {formatHours(c.extra)}</span>}
              {c.sundays > 0 && <span>Dimanches : {c.sundays}</span>}
              {c.holidays > 0 && <span>Fériés : {c.holidays}</span>}
              {absLabel(c) && <span>{absLabel(c)}</span>}
              {c.cost !== undefined && <span>Coût : {euros(c.cost)}</span>}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4 p-5">
        <h2 className="font-semibold">Export pour le comptable</h2>
        <p className="mt-1 mb-4 text-sm text-slate-600">
          Mois de <b className="capitalize">{MONTHS_FR[ym.m]} {ym.y}</b> : heures, heures sup estimées, dimanches, fériés et absences par salarié{hasCost ? ", coût estimé" : ""}.
          {mode === "week" && " Passez en vue « Mois » pour choisir un autre mois."}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" onClick={() => exportMonth("xlsx")}>
            <FileSpreadsheet size={16} /> Télécharger en Excel
          </Button>
          <Button onClick={() => exportMonth("csv")}>
            <FileText size={16} /> Télécharger en CSV
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-600">Le planning en PDF A4 reste disponible dans « Partage ».</p>
      </Card>

      <FairnessCard />
    </div>
  );
}

/** Équité sur plusieurs semaines : week-ends, fermetures, coupures. */
function FairnessCard() {
  const { state } = useApp();
  // Arrivée depuis le badge « Équité » du planning : on descend jusqu'au tableau
  useEffect(() => {
    if (!/equite$/.test(window.location.hash)) return;
    const t = setTimeout(() => document.getElementById("equite")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => clearTimeout(t);
  }, []);
  const f = fairnessTable(state, state.currentWeek);
  const max = (k: "weekends" | "closings" | "splits") => Math.max(1, ...f.rows.map((r) => r.total[k]));
  const cols = [
    { k: "weekends" as const, label: "Week-ends" },
    { k: "closings" as const, label: "Fermetures" },
    { k: "splits" as const, label: "Coupures" },
  ];
  return (
    <Card id="equite" className="mt-4 scroll-mt-20 p-5">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Scale size={17} className="text-slate-500" /> Équité
        </h2>
        <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", f.level === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")}>{f.level === "ok" ? "Équilibré" : "À surveiller"}</span>
      </div>
      <p className="mb-3 text-sm text-slate-600">
        Sur {f.weeks ? `les ${f.weeks + 1} dernières semaines` : "cette semaine"} (semaine affichée comprise). Le générateur s&apos;en sert pour répartir les week-ends, les fermetures et les coupures.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="py-1.5 font-medium">Salarié</th>
              {cols.map((c) => (
                <th key={c.k} className="py-1.5 font-medium">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {f.rows.map((r) => (
              <tr key={r.employee.id}>
                <td className="py-2 pr-3 font-medium whitespace-nowrap">{r.employee.firstName}</td>
                {cols.map((c) => (
                  <td key={c.k} className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-right tabular-nums">{r.total[c.k]}</span>
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <span className="block h-full rounded-full bg-brand-500" style={{ width: `${(r.total[c.k] / max(c.k)) * 100}%` }} />
                      </span>
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">Une personne à temps partiel en fait logiquement moins : la comparaison en tient compte.</p>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-xs text-slate-600">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-slate-600">{sub}</div>
    </Card>
  );
}

function signed(h: number) {
  if (Math.abs(h) < 0.05) return "0 h";
  return `${h > 0 ? "+" : "−"}${formatHours(Math.abs(h))}`;
}

function absLabel(c: Counter) {
  return (Object.keys(c.absences) as AbsenceType[])
    .filter((k) => c.absences[k] > 0)
    .map((k) => `${ABSENCE_TYPES[k].short} ${c.absences[k]} j`)
    .join(" · ");
}
