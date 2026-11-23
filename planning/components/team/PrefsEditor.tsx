"use client";

// Préférences et plages horaires d'un salarié (utilisé dans sa fiche et dans
// l'espace salarié). Préférence = souhait ; plage horaire = limite respectée.

import { Plus, Trash2 } from "lucide-react";
import type { EmployeePrefs, Service } from "@/lib/types";
import { DAYS_SHORT } from "@/lib/time";
import { cx, inputClass } from "../ui";

type Win = NonNullable<EmployeePrefs["timeWindows"]>[number];

export function PrefsEditor({ prefs, services, onChange }: { prefs: EmployeePrefs | undefined; services: Service[]; onChange: (p: EmployeePrefs) => void }) {
  const p = prefs ?? {};
  const preferred = p.preferredServices ?? [];
  const windows = p.timeWindows ?? [];
  const setWin = (i: number, patch: Partial<Win>) => onChange({ ...p, timeWindows: windows.map((w, j) => (j === i ? { ...w, ...patch } : w)) });
  const chip = (active: boolean) => cx("min-h-11 rounded-full border px-3 text-[13px] font-medium sm:min-h-9", active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50");

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium">Préfère travailler</div>
        <div className="mb-2 text-xs text-slate-600">Un souhait : Quinzo le respecte quand c&apos;est possible.</div>
        <div className="flex flex-wrap gap-1.5">
          {services.map((sv) => {
            const on = preferred.includes(sv.id);
            return (
              <button key={sv.id} type="button" aria-pressed={on} onClick={() => onChange({ ...p, preferredServices: on ? preferred.filter((x) => x !== sv.id) : [...preferred, sv.id] })} className={chip(on)}>
                {sv.name.toLowerCase().startsWith("le ") ? sv.name : `Le ${sv.name.toLowerCase()}`}
              </button>
            );
          })}
          <button type="button" aria-pressed={!preferred.length} onClick={() => onChange({ ...p, preferredServices: [] })} className={chip(!preferred.length)}>
            Peu importe
          </button>
        </div>
      </div>

      <div>
        <div className="text-sm font-medium">Plages horaires</div>
        <div className="mb-2 text-xs text-slate-600">Une limite stricte, par exemple « étudiant : pas avant 17 h en semaine ».</div>
        <div className="space-y-2">
          {windows.map((w, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 grid grid-cols-7 gap-1">
                {DAYS_SHORT.map((d, day) => {
                  const on = w.days.includes(day);
                  return (
                    <button key={day} type="button" aria-pressed={on} onClick={() => setWin(i, { days: on ? w.days.filter((x) => x !== day) : [...w.days, day].sort() })} className={cx("h-11 rounded-lg border text-[12px] font-medium sm:h-9", on ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 text-slate-600")}>
                      {d}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-1.5">
                  Pas avant
                  <input type="time" className={cx(inputClass, "w-28")} value={w.from ?? ""} onChange={(e) => setWin(i, { from: e.target.value || undefined })} />
                </label>
                <label className="flex items-center gap-1.5">
                  pas après
                  <input type="time" className={cx(inputClass, "w-28")} value={w.to ?? ""} onChange={(e) => setWin(i, { to: e.target.value || undefined })} />
                </label>
                <button type="button" aria-label="Retirer cette plage" onClick={() => onChange({ ...p, timeWindows: windows.filter((_, j) => j !== i) })} className="ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
              <input className={cx(inputClass, "mt-2")} placeholder="Note (ex. cours à la fac)" value={w.label ?? ""} onChange={(e) => setWin(i, { label: e.target.value || undefined })} />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onChange({ ...p, timeWindows: [...windows, { days: [0, 1, 2, 3, 4], from: "17:00", label: "étudiant" }] })} className="flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Plus size={15} /> Étudiant : pas avant 17 h en semaine
            </button>
            <button type="button" onClick={() => onChange({ ...p, timeWindows: [...windows, { days: [], from: undefined, to: undefined }] })} className="flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Plus size={15} /> Autre plage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
