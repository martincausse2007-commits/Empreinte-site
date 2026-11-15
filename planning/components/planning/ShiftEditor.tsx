"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { AppState, Shift } from "@/lib/types";
import { computeAlerts, isUnavailable, shiftHours } from "@/lib/rules";
import { DAYS, formatHours, formatTime } from "@/lib/time";
import { POST_COLORS } from "@/lib/colors";
import { Button, Field, Modal, cx, inputClass } from "../ui";

export function ShiftEditor({
  state,
  shifts,
  initial,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  state: AppState;
  shifts: Shift[];
  initial: Shift;
  isNew: boolean;
  onClose: () => void;
  onSave: (s: Shift) => void;
  onDelete: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Shift>(initial);
  const set = (patch: Partial<Shift>) => setDraft((d) => ({ ...d, ...patch }));
  const employee = state.employees.find((e) => e.id === draft.employeeId);

  // Aperçu des alertes que provoquerait ce créneau
  const preview = useMemo(() => {
    const next = [...shifts.filter((s) => s.id !== draft.id), draft];
    return computeAlerts(state, next).filter(
      (a) => a.severity === "error" && (a.employeeId === draft.employeeId || a.shiftIds?.includes(draft.id)),
    );
  }, [state, shifts, draft]);

  const valid = draft.employeeId && draft.start && draft.end && draft.start !== draft.end;

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Nouveau créneau" : "Modifier le créneau"}
      footer={
        <>
          {!isNew && (
            <Button variant="danger" onClick={() => onDelete(draft.id)} aria-label="Supprimer">
              <Trash2 size={16} />
              <span className="hidden sm:inline">Supprimer</span>
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} onClick={() => onSave(draft)}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Employé">
          <select className={inputClass} value={draft.employeeId} onChange={(e) => set({ employeeId: e.target.value })}>
            {state.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
                {isUnavailable(e, draft.day) ? " (indisponible)" : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Jour">
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => set({ day: i })}
                className={cx(
                  "h-10 rounded-lg border text-[13px] font-medium",
                  draft.day === i ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Horaires">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {state.services.map((sv) => (
              <button
                key={sv.id}
                type="button"
                onClick={() => set({ start: sv.start, end: sv.end })}
                className={cx(
                  "rounded-full border px-3 py-1 text-[13px]",
                  draft.start === sv.start && draft.end === sv.end ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                )}
              >
                {sv.name} · {formatTime(sv.start)}–{formatTime(sv.end)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="time" className={inputClass} value={draft.start} onChange={(e) => set({ start: e.target.value })} />
            <span className="text-slate-400">→</span>
            <input type="time" className={inputClass} value={draft.end} onChange={(e) => set({ end: e.target.value })} />
          </div>
          {valid && <p className="mt-1.5 text-xs text-slate-500">Durée : {formatHours(shiftHours(draft))}</p>}
        </Field>

        <Field label="Poste">
          <div className="flex flex-wrap gap-1.5">
            {state.posts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => set({ postId: p.id })}
                className={cx(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium",
                  draft.postId === p.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50",
                )}
              >
                <span className={cx("h-2 w-2 rounded-full", POST_COLORS[p.color].dot)} />
                {p.name}
                {employee && !employee.postIds.includes(p.id) && <span className="text-[11px] opacity-60">(hors poste)</span>}
              </button>
            ))}
          </div>
        </Field>

        {preview.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-red-200 bg-red-50 p-3">
            {preview.map((a) => (
              <div key={a.id} className="flex gap-2 text-[13px] text-red-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>
                  <b className="font-semibold">{a.title}</b> — {a.detail}
                </span>
              </div>
            ))}
            <p className="pt-1 text-xs text-red-700/80">Vous pouvez enregistrer quand même : l&apos;alerte restera visible sur le planning.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
