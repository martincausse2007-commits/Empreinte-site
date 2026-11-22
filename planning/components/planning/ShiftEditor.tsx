"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { AppState, Shift } from "@/lib/types";
import { isUnavailable, serviceActive, shiftHours, svTime } from "@/lib/rules";
import { computeAlerts } from "@/lib/engine/check";
import { replacementCandidates } from "@/lib/replace";
import { ABSENCE_TYPES, absencesForWeek } from "@/lib/absences";
import type { AbsenceType } from "@/lib/types";
import { UserRoundSearch } from "lucide-react";
import { Avatar } from "../ui";
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
  week,
  onReplace,
}: {
  week: string;
  /** Confie ce créneau à quelqu'un d'autre ; marque éventuellement l'absence de la personne prévue. */
  onReplace: (employeeId: string, absence?: AbsenceType) => void;
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

  // Aperçu, AVANT d'enregistrer, de ce que ce créneau provoquerait (même module que le bandeau)
  const preview = useMemo(() => {
    const next = [...shifts.filter((s) => s.id !== draft.id), draft];
    const before = new Set(computeAlerts(state, shifts.filter((s) => s.id !== draft.id)).map((a) => a.id));
    return computeAlerts(state, next).filter(
      (a) => a.employeeId === draft.employeeId && (a.shiftIds?.includes(draft.id) || a.severity === "error" || !before.has(a.id)),
    );
  }, [state, shifts, draft]);
  const previewErrors = preview.filter((a) => a.severity === "error");
  const previewWarnings = preview.filter((a) => a.severity === "warning");

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
            {state.employees.filter((e) => !e.archived || e.id === draft.employeeId).map((e) => (
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
                  "h-11 rounded-lg border text-[13px] font-medium",
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
            {state.services
              .filter((sv) => serviceActive(sv, draft.day))
              .map((sv) => {
                const t = svTime(sv, draft.day);
                return (
                  <button
                    key={sv.id}
                    type="button"
                    onClick={() => set({ start: t.start, end: t.end, breakMinutes: sv.breakMinutes })}
                    className={cx(
                      "rounded-full border px-3 py-1 text-[13px]",
                      draft.start === t.start && draft.end === t.end ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {sv.name} · {formatTime(t.start)}–{formatTime(t.end)}
                  </button>
                );
              })}
          </div>
          <div className="flex items-center gap-2">
            <input type="time" className={inputClass} value={draft.start} onChange={(e) => set({ start: e.target.value })} />
            <span className="text-slate-500">→</span>
            <input type="time" className={inputClass} value={draft.end} onChange={(e) => set({ end: e.target.value })} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">{valid && <>Temps de travail : {formatHours(shiftHours(draft))}</>}</span>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              Pause
              <select
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                value={draft.breakMinutes ?? 0}
                onChange={(e) => set({ breakMinutes: Number(e.target.value) || undefined })}
              >
                {[0, 15, 20, 30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>
                    {m ? `${m} min` : "aucune"}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
                {employee && !employee.postIds.includes(p.id) && <span className="text-[11px]">(hors poste)</span>}
              </button>
            ))}
          </div>
        </Field>

        {previewErrors.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-red-300 bg-red-50 p-3" role="alert">
            <div className="text-xs font-semibold tracking-wide text-red-800 uppercase">Interdit</div>
            {previewErrors.map((a) => (
              <div key={a.id} className="flex gap-2 text-[13px] text-red-900">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-600" aria-hidden />
                <span>
                  <b className="font-semibold">{a.title}</b> — {a.detail}
                </span>
              </div>
            ))}
            <p className="pt-1 text-xs text-red-800">Vous pouvez enregistrer quand même : l&apos;alerte restera visible sur le planning.</p>
          </div>
        )}
        {previewWarnings.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-amber-300 bg-amber-50 p-3">
            <div className="text-xs font-semibold tracking-wide text-amber-900 uppercase">À vérifier</div>
            {previewWarnings.map((a) => (
              <div key={a.id} className="flex gap-2 text-[13px] text-amber-950">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
                <span>
                  <b className="font-semibold">{a.title}</b> — {a.detail}
                </span>
              </div>
            ))}
          </div>
        )}
        {!isNew && <ReplaceSection state={state} week={week} shifts={shifts} shift={initial} onReplace={onReplace} />}
      </div>
    </Modal>
  );
}

function ReplaceSection({ state, week, shifts, shift, onReplace }: { state: AppState; week: string; shifts: Shift[]; shift: Shift; onReplace: (id: string, absence?: AbsenceType) => void }) {
  const person = state.employees.find((e) => e.id === shift.employeeId);
  const already = absencesForWeek(state, week).get(shift.employeeId)?.get(shift.day);
  const [open, setOpen] = useState(!!already);
  const [absence, setAbsence] = useState<AbsenceType | "">(already ?? "absence");
  const candidates = useMemo(() => (open ? replacementCandidates(state, week, shifts, shift) : []), [open, state, week, shifts, shift]);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <UserRoundSearch size={16} /> Absence ou empêchement ? Trouver un remplaçant
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="mb-2 text-sm font-semibold">Remplacer {person?.firstName}</div>
      {already ? (
        <p className="mb-3 text-[13px] text-slate-700">
          {person?.firstName} est en <b>{ABSENCE_TYPES[already].label.toLowerCase()}</b> ce jour-là.
        </p>
      ) : (
        <div className="mb-3">
          <div className="mb-1.5 text-[13px] text-slate-700">Noter l&apos;absence de {person?.firstName} ce jour (sans motif) :</div>
          <div className="flex flex-wrap gap-1.5">
            {(["", ...Object.keys(ABSENCE_TYPES)] as (AbsenceType | "")[]).map((t) => (
              <button
                key={t || "none"}
                type="button"
                onClick={() => setAbsence(t)}
                aria-pressed={absence === t}
                className={cx("min-h-11 rounded-full border px-3 text-[13px] sm:min-h-8", absence === t ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700")}
              >
                {t ? ABSENCE_TYPES[t].label : "Ne rien noter"}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mb-1.5 text-[13px] text-slate-700">Remplaçants possibles, du plus adapté au moins adapté :</div>
      {candidates.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700">Personne ne peut prendre ce créneau sans enfreindre une règle. Laissez la place à pourvoir ou modifiez les horaires.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {candidates.slice(0, 6).map((c) => (
            <li key={c.employee.id}>
              <button
                type="button"
                onClick={() => onReplace(c.employee.id, already ? undefined : absence || undefined)}
                className="flex min-h-11 w-full items-center gap-3 py-2 text-left hover:bg-slate-50"
              >
                <Avatar id={c.employee.id} name={`${c.employee.firstName} ${c.employee.lastName}`} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{c.employee.firstName}</span>
                  <span className="block text-xs text-slate-600">
                    {c.mainPost ? "Poste principal" : "Poste secondaire"} · {c.remaining > 0.01 ? `${formatHours(c.remaining)} restantes` : `contrat déjà rempli`} · repos respectés
                  </span>
                  {c.overContract !== undefined && <span className="block text-xs font-medium text-amber-900">Heures sup : dépasserait son contrat de {formatHours(c.overContract)}</span>}
                  {c.newWarnings.length > 0 && <span className="block text-xs text-amber-900">À vérifier : {c.newWarnings.join(" · ")}</span>}
                </span>
                <span className="text-xs font-semibold text-brand-700">Choisir</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
