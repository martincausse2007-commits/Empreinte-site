"use client";

import Link from "next/link";
import { ChevronRight, UserPlus } from "lucide-react";
import { useApp } from "@/lib/store";
import type { Employee } from "@/lib/types";
import { hoursByEmployee, isUnavailable } from "@/lib/rules";
import { DAYS_SHORT } from "@/lib/time";
import { POST_COLORS } from "@/lib/colors";
import { Avatar, Card, PageHeader, buttonClass, cx } from "@/components/ui";
import { HoursMeter } from "@/components/planning/HoursMeter";

export default function TeamPage() {
  const { state } = useApp();
  const hours = hoursByEmployee(state.plans[state.currentWeek] ?? []);
  const post = (id: string) => state.posts.find((p) => p.id === id);

  return (
    <div>
      <PageHeader
        title="Équipe"
        subtitle={`${state.employees.filter((e) => !e.archived).length} personnes · ${state.employees.filter((e) => !e.archived).reduce((a, e) => a + e.contractHours, 0)} h de contrat par semaine`}
        actions={
          <Link href="/equipe/nouveau" className={buttonClass("primary")}>
            <UserPlus size={16} /> Ajouter un employé
          </Link>
        }
      />

      <Card className="divide-y divide-slate-100 overflow-hidden">
        <div className="hidden grid-cols-[1.4fr_1fr_1.2fr_1.3fr_24px] gap-4 bg-slate-50/70 px-5 py-2.5 text-xs font-medium text-slate-500 md:grid">
          <span>Nom</span>
          <span>Postes</span>
          <span>Indisponibilités</span>
          <span>Heures (semaine affichée)</span>
          <span />
        </div>
        {state.employees.filter((e) => !e.archived).map((e) => (
          <Link
            key={e.id}
            href={`/equipe/${e.id}`}
            className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left transition hover:bg-slate-50/70 md:grid-cols-[1.4fr_1fr_1.2fr_1.3fr_24px] md:px-5"
          >
            <span className="flex min-w-0 items-center gap-3">
              <Avatar id={e.id} name={`${e.firstName} ${e.lastName}`} size={36} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {e.firstName} {e.lastName}
                </span>
                <span className="block text-xs text-slate-500">{e.contractHours} h / semaine</span>
              </span>
            </span>
            <ChevronRight size={18} className="text-slate-500 md:order-last" />
            <span className="col-span-2 flex flex-wrap gap-1 md:col-span-1">
              {e.postIds.map((id, i) => {
                const p = post(id);
                if (!p) return null;
                return (
                  <span key={id} className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", POST_COLORS[p.color].soft, i > 0 && "font-normal")}>
                    {p.name}
                  </span>
                );
              })}
            </span>
            <span className="col-span-2 text-xs text-slate-500 md:col-span-1">{summarizeUnavailability(e, state.services) || <span className="text-slate-500">Aucune</span>}</span>
            <span className="col-span-2 md:col-span-1">
              <HoursMeter hours={hours[e.id] ?? 0} contract={e.contractHours} compact />
            </span>
          </Link>
        ))}
      </Card>

    </div>
  );
}

function summarizeUnavailability(e: Employee, services: { id: string; name: string }[]) {
  return Array.from({ length: 7 }, (_, d) => {
    if (isUnavailable(e, d)) return DAYS_SHORT[d];
    const sv = services.filter((s) => isUnavailable(e, d, s.id));
    return sv.length ? `${DAYS_SHORT[d]} ${sv.map((s) => s.name.toLowerCase()).join("/")}` : null;
  })
    .filter(Boolean)
    .join(", ");
}

