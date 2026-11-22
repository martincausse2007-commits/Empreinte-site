"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { useApp } from "@/lib/store";
import { getNeed, needKey, serviceActive, shiftHours, svTime } from "@/lib/rules";
import { DAYS, DAYS_SHORT, formatHours, formatTime } from "@/lib/time";
import { POST_COLORS } from "@/lib/colors";
import { Button, Card, PageHeader, Stepper, cx, useToast } from "@/components/ui";

export default function NeedsPage() {
  const { state, update } = useApp();
  const toast = useToast();
  const [serviceId, setServiceId] = useState(state.services[0]?.id);
  const sv = state.services.find((s) => s.id === serviceId) ?? state.services[0];

  const setNeed = (day: number, postId: string, v: number) =>
    update((s) => ({ ...s, needs: { ...s.needs, [needKey(day, sv.id, postId)]: v } }));

  const copyTuesdayToWeek = () => {
    update((s) => {
      const needs = { ...s.needs };
      const from = [1, 0, 2, 3, 4].find((d) => serviceActive(sv, d)) ?? 1;
      for (let d = 0; d < 5; d++) if (serviceActive(sv, d)) for (const p of s.posts) needs[needKey(d, sv.id, p.id)] = getNeed(s.needs, from, sv.id, p.id);
      return { ...s, needs };
    });
    toast(`Besoins copiés du lundi au vendredi (${sv.name.toLowerCase()})`);
  };

  let totalHours = 0;
  for (const s of state.services)
    for (let d = 0; d < 7; d++) {
      if (!serviceActive(s, d)) continue;
      const people = state.posts.reduce((a, p) => a + getNeed(state.needs, d, s.id, p.id), 0);
      totalHours += people * shiftHours({ ...svTime(s, d), breakMinutes: s.breakMinutes });
    }
  const contract = state.employees.reduce((a, e) => a + e.contractHours, 0);

  return (
    <div>
      <PageHeader
        title="Besoins"
        subtitle="Combien de personnes faut-il, par jour, par service et par poste ? Mettez 0 quand c'est fermé."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Card className="px-4 py-3">
          <div className="text-xs text-slate-500">Heures nécessaires / semaine</div>
          <div className="text-xl font-semibold">{formatHours(totalHours)}</div>
        </Card>
        <Card className="px-4 py-3">
          <div className="text-xs text-slate-500">Heures disponibles (contrats)</div>
          <div className={cx("text-xl font-semibold", contract < totalHours && "text-red-600")}>
            {formatHours(contract)}
            <span className="ml-2 text-sm font-normal text-slate-500">
              {contract >= totalHours ? `marge de ${formatHours(contract - totalHours)}` : `il manque ${formatHours(totalHours - contract)}`}
            </span>
          </div>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-slate-200/60 p-1">
          {state.services.map((s) => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id)}
              className={cx("rounded-lg px-4 py-1.5 text-sm font-medium", s.id === sv.id ? "bg-white shadow-sm" : "text-slate-600")}
            >
              {s.name} <span className="text-xs font-normal text-slate-500">{formatTime(s.start)}–{formatTime(s.end)}</span>
            </button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={copyTuesdayToWeek}>
          <Copy size={14} /> Même chose du lundi au vendredi
        </Button>
      </div>

      {/* Ordinateur : tableau */}
      <Card className="hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/70 text-xs text-slate-500">
              <th className="px-5 py-2.5 text-left font-medium">Poste</th>
              {DAYS_SHORT.map((d) => (
                <th key={d} className="px-2 py-2.5 font-medium">
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.posts.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-2 font-medium">
                    <span className={cx("h-2 w-2 rounded-full", POST_COLORS[p.color].dot)} />
                    {p.name}
                  </span>
                </td>
                {DAYS.map((_, d) => (
                  <td key={d} className="px-1 py-2 text-center">
                    {serviceActive(sv, d) ? (
                      <Stepper value={getNeed(state.needs, d, sv.id, p.id)} onChange={(v) => setNeed(d, p.id, v)} max={20} />
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-slate-50/70 text-xs text-slate-500">
              <td className="px-5 py-2.5 font-medium">Total</td>
              {DAYS.map((_, d) => {
                const t = state.posts.reduce((a, p) => a + getNeed(state.needs, d, sv.id, p.id), 0);
                return (
                  <td key={d} className="py-2.5 text-center font-semibold">
                    {t || <span className="font-normal text-slate-500">Fermé</span>}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Mobile : une carte par jour */}
      <div className="space-y-2.5 md:hidden">
        {DAYS.map((d, day) => {
          if (!serviceActive(sv, day)) return null;
          const t = state.posts.reduce((a, p) => a + getNeed(state.needs, day, sv.id, p.id), 0);
          return (
            <Card key={day} className="px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">{d}</span>
                <span className="text-xs text-slate-500">{t ? `${t} personne${t > 1 ? "s" : ""}` : "Fermé"}</span>
              </div>
              <div className="space-y-2">
                {state.posts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <span className={cx("h-2 w-2 rounded-full", POST_COLORS[p.color].dot)} />
                      {p.name}
                    </span>
                    <Stepper value={getNeed(state.needs, day, sv.id, p.id)} onChange={(v) => setNeed(day, p.id, v)} max={20} />
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
