"use client";

// Page d'accueil du gérant : tous ses établissements d'un coup d'œil.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { AlertOctagon, AlertTriangle, ArrowRight, CalendarCheck2, CalendarClock, Plus, Users } from "lucide-react";
import { useApp, type EstablishmentSummary } from "@/lib/store";
import { activity } from "@/lib/presets";
import { computeAlerts } from "@/lib/engine/check";
import { formatWeekRange } from "@/lib/time";
import type { AppState } from "@/lib/types";
import { ActivityIcon } from "@/components/shell/ActivityIcon";
import { cx } from "@/components/ui";

type Stats = { people: number; shifts: number; errors: number; warnings: number; week: string };

function statsOf(s: AppState): Stats {
  const shifts = s.plans[s.currentWeek] ?? [];
  const alerts = shifts.length ? computeAlerts(s, shifts) : [];
  return {
    people: s.employees.filter((e) => !e.archived).length,
    shifts: shifts.length,
    errors: alerts.filter((a) => a.severity === "error").length,
    warnings: alerts.filter((a) => a.severity === "warning").length,
    week: s.currentWeek,
  };
}

export default function EstablishmentsPage() {
  const { establishments, activeId, switchTo, demoItem, mode, state, ready } = useApp();
  const router = useRouter();
  const stats = useMemo(() => {
    const out: Record<string, Stats | undefined> = {};
    for (const e of establishments) {
      const s = e.id === activeId ? state : mode === "demo" ? demoItem(e.id) : undefined;
      out[e.id] = s ? statsOf(s) : undefined;
    }
    return out;
  }, [establishments, activeId, state, mode, demoItem]);

  const totalPeople = Object.values(stats).reduce((a, s) => a + (s?.people ?? 0), 0);
  const open = async (id: string) => {
    await switchTo(id);
    router.push("/planning");
  };

  if (!ready) return <div className="h-96 animate-pulse rounded-2xl bg-white" />;

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-medium text-brand-700">Mes établissements</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
          {establishments.length} établissement{establishments.length > 1 ? "s" : ""}
          {totalPeople > 0 && <span className="text-slate-500">, {totalPeople} personnes à planifier</span>}
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {establishments.map((e) => (
          <EstablishmentCard key={e.id} e={e} stats={stats[e.id]} active={e.id === activeId} onOpen={() => open(e.id)} />
        ))}
        <Link
          href="/configuration?nouveau=1"
          className="group flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-brand-400 hover:bg-brand-50"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-xs ring-1 ring-slate-200 group-hover:ring-brand-200">
            <Plus size={22} />
          </span>
          <span className="font-display text-lg font-semibold">Ajouter un établissement</span>
          <span className="max-w-60 text-sm text-slate-600">Un autre restaurant, une boutique, un bar… Le questionnaire prend 5 à 10 minutes.</span>
        </Link>
      </div>
    </div>
  );
}

function EstablishmentCard({ e, stats, active, onOpen }: { e: EstablishmentSummary; stats?: Stats; active: boolean; onOpen: () => void }) {
  const status = !stats ? null : stats.shifts === 0 ? "todo" : stats.errors ? "errors" : stats.warnings ? "warnings" : "ok";
  return (
    <button
      onClick={onOpen}
      className={cx(
        "group flex min-h-48 flex-col rounded-2xl border bg-white p-5 text-left shadow-xs transition hover:-translate-y-0.5 hover:shadow-md",
        active ? "border-brand-300 ring-2 ring-brand-100" : "border-slate-200/80",
      )}
    >
      <div className="flex items-start gap-3">
        <ActivityIcon type={e.type} className="bg-brand-50 text-brand-700" />
        <div className="min-w-0 flex-1">
          <div className="font-display truncate text-lg font-semibold">{e.name}</div>
          <div className="text-sm text-slate-600">
            {activity(e.type).label}
            {e.role === "manager" && " · vous êtes manager"}
          </div>
        </div>
        {active && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800">Ouvert</span>}
      </div>

      {stats ? (
        <div className="mt-5 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <Users size={15} className="text-slate-500" /> {stats.people} personnes
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CalendarClock size={15} className="text-slate-500" /> Semaine du {formatWeekRange(stats.week)}
          </div>
          <div>
            {status === "todo" && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">À préparer</span>}
            {status === "errors" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800">
                <AlertOctagon size={13} className="text-red-600" /> {stats.errors} à corriger
              </span>
            )}
            {status === "warnings" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                <AlertTriangle size={13} className="text-amber-700" /> {stats.warnings} à vérifier
              </span>
            )}
            {status === "ok" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                <CalendarCheck2 size={13} /> Planning en règle
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-600">Ouvrez-le pour voir son planning.</p>
      )}

      <span className="mt-auto flex items-center gap-1 pt-5 text-sm font-semibold text-brand-700">
        Ouvrir le planning <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
