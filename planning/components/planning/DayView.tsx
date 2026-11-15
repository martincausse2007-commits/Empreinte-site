"use client";

import { Plus } from "lucide-react";
import type { AppState, Shift } from "@/lib/types";
import type { Alert } from "@/lib/rules";
import { coverage, getNeed, hoursByEmployee, serviceActive, shiftCoversService, svTime } from "@/lib/rules";
import { DAYS, DAYS_SHORT, dateOfDay, formatTime } from "@/lib/time";
import { POST_COLORS } from "@/lib/colors";
import { Avatar, Card, cx } from "../ui";
import { HoursMeter } from "./HoursMeter";
import { AlertTriangle } from "lucide-react";

type Props = {
  state: AppState;
  week: string;
  shifts: Shift[];
  alerts: Alert[];
  errorShifts: Set<string>;
  day: number;
  onDay: (d: number) => void;
  onEdit: (s: Shift) => void;
  onAddSlot: (day: number, serviceId: string, postId: string) => void;
};

/** Vue mobile : un jour à la fois, organisé par service puis par poste. */
export function DayView({ state, week, shifts, alerts, errorShifts, day, onDay, onEdit, onAddSlot }: Props) {
  const dayShifts = shifts.filter((s) => s.day === day);
  const cov = coverage(state, shifts);
  const emp = (id: string) => state.employees.find((e) => e.id === id);
  const hours = hoursByEmployee(shifts);
  const used = new Set<string>();

  return (
    <div>
      {/* Sélecteur de jour */}
      <div className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4">
        {DAYS_SHORT.map((d, i) => {
          const n = alerts.filter((a) => a.day === i || (a.shiftIds && shifts.some((s) => s.day === i && a.shiftIds!.includes(s.id)))).length;
          const closed = cov.filter((c) => c.day === i).every((c) => c.needed === 0);
          return (
            <button
              key={i}
              onClick={() => onDay(i)}
              className={cx(
                "relative flex min-w-[48px] flex-1 flex-col items-center rounded-xl border py-2 transition",
                i === day ? "border-brand-600 bg-brand-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700",
                closed && i !== day && "text-slate-400",
              )}
            >
              <span className="text-[11px] font-medium opacity-80">{d}</span>
              <span className="text-base font-semibold tabular-nums">{dateOfDay(week, i).getDate()}</span>
              {n > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {state.services.filter((sv) => serviceActive(sv, day)).map((sv) => {
          const t = svTime(sv, day);
          const posts = state.posts.filter((p) => getNeed(state.needs, day, sv.id, p.id) > 0 || dayShifts.some((s) => s.postId === p.id && shiftCoversService(s, sv)));
          if (posts.length === 0)
            return (
              <Card key={sv.id} className="px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{sv.name}</span>
                  <span className="text-slate-400">Fermé</span>
                </div>
              </Card>
            );
          return (
            <Card key={sv.id} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <span className="font-semibold">{sv.name}</span>{" "}
                  <span className="text-sm text-slate-500">
                    {formatTime(t.start)} – {formatTime(t.end)}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {posts.map((p) => {
                  const c = cov.find((x) => x.day === day && x.serviceId === sv.id && x.postId === p.id);
                  const list = dayShifts.filter((s) => s.postId === p.id && shiftCoversService(s, sv));
                  list.forEach((s) => used.add(s.id));
                  const missing = Math.max(0, (c?.needed ?? 0) - list.length);
                  return (
                    <div key={p.id} className="px-4 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <span className={cx("h-2 w-2 rounded-full", POST_COLORS[p.color].dot)} />
                          {p.name}
                        </span>
                        <span className={cx("text-xs font-semibold tabular-nums", missing ? "text-amber-700" : "text-emerald-700")}>
                          {list.length}/{c?.needed ?? 0}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {list.map((s) => {
                          const e = emp(s.employeeId);
                          if (!e) return null;
                          const err = errorShifts.has(s.id);
                          return (
                            <button
                              key={s.id}
                              onClick={() => onEdit(s)}
                              className={cx(
                                "flex items-center gap-2 rounded-full border bg-white py-1 pr-3 pl-1 text-sm shadow-xs active:scale-[0.98]",
                                err ? "border-red-300 ring-2 ring-red-300/60" : "border-slate-200",
                              )}
                            >
                              <Avatar id={e.id} name={`${e.firstName} ${e.lastName}`} size={26} />
                              <span className="font-medium">{e.firstName}</span>
                              {(s.start !== t.start || s.end !== t.end) && (
                                <span className="text-xs text-slate-500">
                                  {formatTime(s.start)}–{formatTime(s.end)}
                                </span>
                              )}
                              {err && <AlertTriangle size={13} className="text-red-600" />}
                            </button>
                          );
                        })}
                        {Array.from({ length: missing }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => onAddSlot(day, sv.id, p.id)}
                            className="flex h-[34px] items-center gap-1.5 rounded-full border border-dashed border-amber-300 bg-amber-50 px-3 text-sm font-medium text-amber-800"
                          >
                            <Plus size={14} /> À pourvoir
                          </button>
                        ))}
                        {missing === 0 && (
                          <button
                            onClick={() => onAddSlot(day, sv.id, p.id)}
                            aria-label="Ajouter"
                            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400"
                          >
                            <Plus size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}

        {dayShifts.some((s) => !used.has(s.id)) && (
          <Card className="px-4 py-3">
            <div className="mb-2 text-sm font-semibold">Autres horaires</div>
            <div className="flex flex-wrap gap-2">
              {dayShifts
                .filter((s) => !used.has(s.id))
                .map((s) => (
                  <button key={s.id} onClick={() => onEdit(s)} className="rounded-full border border-slate-200 px-3 py-1 text-sm">
                    {emp(s.employeeId)?.firstName} · {formatTime(s.start)}–{formatTime(s.end)}
                  </button>
                ))}
            </div>
          </Card>
        )}

        <Card className="px-4 py-3">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-semibold">Heures de la semaine</span>
            <span className="text-xs text-slate-500">{DAYS[day]} sélectionné</span>
          </div>
          <div className="space-y-2.5">
            {state.employees.map((e) => (
              <div key={e.id} className="flex items-center gap-3">
                <span className="w-20 truncate text-sm">{e.firstName}</span>
                <HoursMeter hours={hours[e.id] ?? 0} contract={e.contractHours} compact />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
