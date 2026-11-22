"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Copy, LayoutTemplate, Loader2, MoreHorizontal, Plus, Redo2, Share2, Sparkles, Trash2, Undo2, UserPlus } from "lucide-react";
import { uid, useApp } from "@/lib/store";
import type { Shift } from "@/lib/types";
import { serviceActive, svTime } from "@/lib/rules";
import { computeAlerts } from "@/lib/engine/check";
import { applyReinforcements, generateWeek, suggestReinforcements } from "@/lib/generate";
import type { Issue } from "@/lib/engine/check";
import type { Template } from "@/lib/types";
import { applyTemplate, copyWeek } from "@/lib/templates";
import { addWeeks, formatHours, formatTime, formatWeekRange, isoWeekNumber } from "@/lib/time";
import { shiftHours } from "@/lib/rules";
import { Button, Card, Modal, buttonClass, cx, useConfirm, useToast } from "../ui";
import { useRouter } from "next/navigation";
import { useHistoryLayer } from "@/lib/history";
import { WeekGrid } from "./WeekGrid";
import { DayView } from "./DayView";
import { AlertsPanel } from "./AlertsPanel";
import { ShiftEditor } from "./ShiftEditor";
import { flash, shiftsInError } from "./helpers";

export function PlanningView() {
  const { state, ready, update, setShifts, undo, redo, canUndo, canRedo } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const week = state.currentWeek;
  const shifts = useMemo(() => state.plans[week] ?? [], [state.plans, week]);
  const alerts = useMemo(() => computeAlerts(state, shifts), [state, shifts]);
  const errorShifts = useMemo(() => shiftsInError(alerts, shifts), [alerts, shifts]);

  const [editing, setEditing] = useState<{ shift: Shift; isNew: boolean } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  // Le menu « … » se ferme aussi avec Échap ou le bouton retour du téléphone
  useHistoryLayer(menuOpen, () => setMenuOpen(false));
  const [mobileView, setMobileView] = useState<"day" | "week">("day");
  const [day, setDay] = useState(1);
  const [seed, setSeed] = useState(0);

  const goWeek = (n: number) => update((s) => ({ ...s, currentWeek: addWeeks(s.currentWeek, n) }));

  // Annuler / rétablir au clavier : Ctrl+Z, Ctrl+Maj+Z ou Ctrl+Y (hors champs de saisie)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Heures de contrat non planifiées → renforts proposés
  const reinforcements = useMemo(() => (shifts.length ? suggestReinforcements(state, shifts) : []), [state, shifts]);
  const unplanned = alerts.filter((a) => a.kind === "contractUnder").length;
  const [showReinf, setShowReinf] = useState(false);

  function addReinforcements(list = reinforcements) {
    setShifts(week, (cur) => applyReinforcements(cur, list));
    toast(list.length > 1 ? `${list.length} renforts ajoutés` : "Renfort ajouté");
  }

  /** Va à la case concernée par une alerte. */
  const goToIssue = useCallback(
    (a: Issue) => {
      if (a.day !== undefined) setDay(a.day);
      const s = a.shiftIds?.length ? shifts.find((x) => x.id === a.shiftIds![0]) : undefined;
      if (s) {
        setEditing({ shift: s, isNew: false });
        return;
      }
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      if (a.employeeId) {
        if (mobile) setMobileView("week");
        setTimeout(() => flash(a.day !== undefined ? `cell-${a.employeeId}-${a.day}` : `row-${a.employeeId}`) || flash(`row-${a.employeeId}`), 60);
      } else if (a.day !== undefined && !mobile) setTimeout(() => flash(`day-${a.day}`), 60);
    },
    [shifts],
  );

  function runGenerate() {
    setGenerating(true);
    const t0 = performance.now();
    setTimeout(() => {
      const res = generateWeek(state, { seed });
      setSeed((x) => x + 1);
      setShifts(week, () => res.shifts);
      setGenerating(false);
      const ms = Math.max(1, Math.round(performance.now() - t0 - 450));
      toast(
        res.unfilled
          ? `Semaine générée : ${res.filled} créneaux, ${res.unfilled} impossible${res.unfilled > 1 ? "s" : ""} à pourvoir`
          : `Semaine générée : ${res.filled} créneaux couverts en ${ms} ms`,
      );
    }, 450);
  }

  async function onGenerateClick() {
    if (
      shifts.length &&
      !(await confirm({
        title: "Remplacer la semaine ?",
        text: `Les ${shifts.length} créneaux actuels seront remplacés par une nouvelle proposition. Vous pourrez revenir en arrière avec « Annuler ».`,
        confirmLabel: "Générer",
      }))
    )
      return;
    runGenerate();
  }

  async function copyPrevious() {
    setMenuOpen(false);
    const prev = state.plans[addWeeks(week, -1)] ?? [];
    if (!prev.length) return toast("La semaine précédente est vide");
    if (shifts.length && !(await confirm({ title: "Écraser la semaine ?", text: `Les ${shifts.length} créneaux de cette semaine seront remplacés par ceux de la semaine précédente.`, confirmLabel: "Copier" }))) return;
    setShifts(week, () => copyWeek(prev));
    toast("Semaine précédente copiée");
  }

  function newShift(employeeId: string, d: number, serviceId?: string, postId?: string) {
    const e = state.employees.find((x) => x.id === employeeId) ?? state.employees[0];
    const sv = state.services.find((s) => s.id === serviceId) ?? state.services.find((s) => serviceActive(s, d)) ?? state.services[0];
    const t = sv ? svTime(sv, d) : { start: "09:00", end: "17:00" };
    setEditing({
      isNew: true,
      shift: { id: uid("s"), employeeId: e.id, day: d, start: t.start, end: t.end, breakMinutes: sv?.breakMinutes, postId: postId ?? e.postIds[0] ?? state.posts[0].id },
    });
  }

  function addForSlot(d: number, serviceId: string, postId: string) {
    // Propose en premier une personne qui tient ce poste et n'est pas déjà sur ce jour
    const busy = new Set(shifts.filter((s) => s.day === d).map((s) => s.employeeId));
    const cand = state.employees.find((e) => e.postIds.includes(postId) && !busy.has(e.id)) ?? state.employees[0];
    newShift(cand.id, d, serviceId, postId);
  }

  function onMove(shiftId: string, employeeId: string, d: number, copy: boolean) {
    const s0 = shifts.find((x) => x.id === shiftId);
    if (!s0 || (!copy && s0.employeeId === employeeId && s0.day === d)) return; // rien ne bouge : pas d'étape d'annulation
    setShifts(week, (list) => {
      const s = list.find((x) => x.id === shiftId);
      if (!s) return list;
      if (copy) return [...list, { ...s, id: uid("s"), employeeId, day: d }];
      if (s.employeeId === employeeId && s.day === d) return list;
      return list.map((x) => (x.id === shiftId ? { ...x, employeeId, day: d } : x));
    });
  }

  function save(s: Shift) {
    setShifts(week, (list) => (list.some((x) => x.id === s.id) ? list.map((x) => (x.id === s.id ? s : x)) : [...list, s]));
    setEditing(null);
  }

  function remove(id: string) {
    setShifts(week, (list) => list.filter((x) => x.id !== id));
    setEditing(null);
    toast("Créneau supprimé");
  }


  if (!ready) return <div className="h-96 animate-pulse rounded-2xl bg-white" />;

  return (
    <div>
      {/* En-tête */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-xs">
            <button onClick={() => goWeek(-1)} className="flex h-11 w-11 items-center justify-center text-slate-600 hover:text-slate-900" aria-label="Semaine précédente">
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-0 px-1 text-center">
              <div className="text-[15px] font-semibold whitespace-nowrap">{formatWeekRange(week)}</div>
            </div>
            <button onClick={() => goWeek(1)} className="flex h-11 w-11 items-center justify-center text-slate-600 hover:text-slate-900" aria-label="Semaine suivante">
              <ChevronRight size={18} />
            </button>
          </div>
          <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline">Semaine {isoWeekNumber(week)}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo} aria-label="Annuler (Ctrl+Z)" title="Annuler (Ctrl+Z)">
              <Undo2 size={18} />
            </Button>
            <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo} aria-label="Rétablir (Ctrl+Maj+Z)" title="Rétablir (Ctrl+Maj+Z)">
              <Redo2 size={18} />
            </Button>
          </div>
          <Button variant="primary" onClick={onGenerateClick} disabled={generating} className="flex-1 lg:flex-none">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Générer la semaine
          </Button>
          <div className="hidden items-center gap-2 sm:flex">
          <Button onClick={copyPrevious}>
            <Copy size={16} /> Copier S-1
          </Button>
          <Button onClick={() => setTemplatesOpen(true)}>
            <LayoutTemplate size={16} /> Modèles
          </Button>
          <Link href="/partage" className={buttonClass()}>
            <Share2 size={16} /> Partager
          </Link>
          </div>
          <div className="relative">
            <Button onClick={() => setMenuOpen((o) => !o)} aria-label="Plus d'actions" size="icon">
              <MoreHorizontal size={18} />
            </Button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                <div className="animate-pop absolute right-0 z-30 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                  <MenuItem icon={Copy} label="Copier la semaine précédente" onClick={copyPrevious} />
                  <MenuItem icon={LayoutTemplate} label="Appliquer un modèle" onClick={() => (setMenuOpen(false), setTemplatesOpen(true))} />
                  <MenuItem icon={Share2} label="Partager le planning" onClick={() => (setMenuOpen(false), router.push("/partage"))} />
                  <div className="my-1 h-px bg-slate-100" />
                  <MenuItem
                    icon={Trash2}
                    danger
                    label="Vider la semaine"
                    onClick={async () => {
                      setMenuOpen(false);
                      if (!(await confirm({ title: "Vider la semaine ?", text: `Les ${shifts.length} créneaux de la semaine seront retirés. Vous pourrez revenir en arrière avec « Annuler ».`, confirmLabel: "Vider", danger: true }))) return;
                      setShifts(week, () => []);
                      toast("Semaine vidée");
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {shifts.length === 0 ? (
        <EmptyWeek onGenerate={runGenerate} onCopy={copyPrevious} onTemplates={() => setTemplatesOpen(true)} generating={generating} />
      ) : (
        <>
          <div className="mb-4">
            <AlertsPanel alerts={alerts} onSelect={goToIssue} />
          </div>

          {unplanned > 0 && reinforcements.length > 0 && (
            <Card className="mb-4 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <UserPlus size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {formatHours(reinforcements.reduce((a, r) => a + shiftHours(r.shift) - (r.replaces ? shiftHours(shifts.find((x) => x.id === r.replaces) ?? r.shift) : 0), 0))} de contrat à placer
                    </div>
                    <p className="text-sm text-slate-600">
                      Ces heures sont payées. Quinzo propose {reinforcements.length} renfort{reinforcements.length > 1 ? "s" : ""} sur les services les plus chargés, sans enfreindre vos règles.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setShowReinf((v) => !v)} aria-expanded={showReinf}>
                    {showReinf ? "Masquer" : "Voir le détail"}
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => addReinforcements()}>
                    <Plus size={14} /> Tout ajouter
                  </Button>
                </div>
              </div>
              {showReinf && (
                <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                  {reinforcements.map((r) => {
                    const e = state.employees.find((x) => x.id === r.shift.employeeId);
                    return (
                      <li key={r.shift.id + (r.replaces ?? "")} className="flex min-h-11 items-center gap-3 py-2 text-sm">
                        <span className="min-w-0 flex-1">
                          <b className="font-semibold">{e?.firstName}</b> — {r.reason} · {formatTime(r.shift.start)}–{formatTime(r.shift.end)}
                        </span>
                        <Button size="sm" onClick={() => addReinforcements([r])}>
                          Ajouter
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}

          {/* Bascule Jour / Semaine sur mobile */}
          <div className="mb-3 flex rounded-xl bg-slate-200/60 p-1 md:hidden">
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setMobileView(v)}
                className={cx("min-h-11 flex-1 rounded-lg text-sm font-medium", mobileView === v ? "bg-white shadow-sm" : "text-slate-600")}
              >
                {v === "day" ? "Jour" : "Semaine"}
              </button>
            ))}
          </div>

          <div className={cx(mobileView === "day" ? "md:hidden" : "hidden")}>
            <DayView
              state={state}
              week={week}
              shifts={shifts}
              alerts={alerts}
              errorShifts={errorShifts}
              day={day}
              onDay={setDay}
              onEdit={(s) => setEditing({ shift: s, isNew: false })}
              onAddSlot={addForSlot}
            />
          </div>
          <div className={cx(mobileView === "week" ? "block" : "hidden md:block")}>
            <WeekGrid
              state={state}
              week={week}
              shifts={shifts}
              errorShifts={errorShifts}
              onEdit={(s) => setEditing({ shift: s, isNew: false })}
              onAdd={(e, d) => newShift(e, d)}
              onMove={onMove}
            />
            <p className="mt-3 hidden text-xs text-slate-500 md:block">
              Astuce : glissez un créneau pour le déplacer, maintenez <kbd className="rounded border border-slate-200 bg-white px-1">Alt</kbd> pour le dupliquer. Cliquez pour le modifier.
            </p>
            <p className="mt-3 text-xs text-slate-500 md:hidden">Astuce : appui long sur un créneau pour le déplacer.</p>
          </div>
        </>
      )}

      {editing && (
        <ShiftEditor
          key={editing.shift.id}
          state={state}
          shifts={shifts}
          initial={editing.shift}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={remove}
        />
      )}

      <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: { icon: typeof Copy; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cx("flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 sm:min-h-9", danger ? "text-red-600" : "text-slate-700")}>
      <Icon size={16} />
      {label}
    </button>
  );
}

function EmptyWeek({ onGenerate, onCopy, onTemplates, generating }: { onGenerate: () => void; onCopy: () => void; onTemplates: () => void; generating: boolean }) {
  return (
    <Card className="px-6 py-14 text-center sm:py-20">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <CalendarDays size={26} />
      </div>
      <h2 className="text-lg font-semibold">Cette semaine est vide</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
        Laissez Quinzo préparer une proposition complète à partir de vos besoins et des disponibilités de l&apos;équipe. Vous ajusterez ensuite en glisser-déposer.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Button variant="primary" size="lg" onClick={onGenerate} disabled={generating} className="w-full sm:w-auto">
          {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          Générer la semaine
        </Button>
        <Button size="lg" onClick={onCopy} className="w-full sm:w-auto">
          <Copy size={17} /> Copier la semaine précédente
        </Button>
        <Button size="lg" variant="ghost" onClick={onTemplates} className="w-full sm:w-auto">
          <LayoutTemplate size={17} /> Appliquer un modèle
        </Button>
      </div>
    </Card>
  );
}

/** Applique un modèle ou un roulement, avec confirmation si des semaines sont déjà remplies. */
export function useApplyTemplate() {
  const { state, update } = useApp();
  const confirm = useConfirm();
  return async (t: Template) => {
    const filled = t.weeks.map((_, i) => state.plans[addWeeks(state.currentWeek, i)] ?? []).filter((w) => w.length).length;
    if (
      filled &&
      !(await confirm({
        title: "Écraser le planning existant ?",
        text: t.weeks.length > 1 ? `${filled} des ${t.weeks.length} semaines concernées sont déjà remplies : elles seront remplacées.` : "La semaine affichée est déjà remplie : elle sera remplacée.",
        confirmLabel: "Appliquer",
      }))
    )
      return false;
    update((s) => applyTemplate(s, t, s.currentWeek), { record: true });
    return true;
  };
}

export function TemplatesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useApp();
  const toast = useToast();
  const applyT = useApplyTemplate();
  return (
    <Modal open={open} onClose={onClose} title="Appliquer un modèle">
      <p className="mb-4 text-sm text-slate-500">
        Les roulements remplissent plusieurs semaines d&apos;affilée à partir de la semaine affichée ({formatWeekRange(state.currentWeek)}).
      </p>
      <div className="space-y-2">
        {state.templates.length === 0 && <p className="text-sm text-slate-500">Aucun modèle pour l&apos;instant.</p>}
        {state.templates.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
              {t.weeks.length === 1 ? "1 S" : `${t.weeks.length} S`}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{t.name}</div>
              <div className="text-xs text-slate-500">
                {t.weeks.length === 1 ? "Semaine type" : `Roulement sur ${t.weeks.length} semaines`} · {t.weeks.reduce((a, w) => a + w.length, 0)} créneaux
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={async () => {
                if (!(await applyT(t))) return;
                onClose();
                toast(t.weeks.length === 1 ? `« ${t.name} » appliqué` : `Roulement appliqué sur ${t.weeks.length} semaines`);
              }}
            >
              Appliquer
            </Button>
          </div>
        ))}
      </div>
      <Link href="/modeles" onClick={onClose} className="mt-4 block text-center text-sm font-medium text-brand-600">
        Gérer les modèles →
      </Link>
    </Modal>
  );
}
