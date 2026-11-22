"use client";

import { useState } from "react";
import { Copy, LayoutTemplate, Repeat, Save, Trash2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { applyTemplate, copyWeek, makeTemplate } from "@/lib/templates";
import { addWeeks, formatWeekRange } from "@/lib/time";
import { Button, Card, Field, Modal, PageHeader, cx, inputClass, useToast } from "@/components/ui";

export default function TemplatesPage() {
  const { state, update, setShifts } = useApp();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [weeks, setWeeks] = useState(1);
  const week = state.currentWeek;

  function copyPrev() {
    const prev = state.plans[addWeeks(week, -1)] ?? [];
    if (!prev.length) return toast("La semaine précédente est vide");
    setShifts(week, () => copyWeek(prev));
    toast("Semaine précédente copiée");
  }

  return (
    <div>
      <PageHeader title="Modèles & roulements" subtitle={`Semaine affichée : ${formatWeekRange(week)}`} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Card className="flex items-start gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Copy size={18} />
          </div>
          <div className="flex-1">
            <div className="font-medium">Copier la semaine précédente</div>
            <p className="mt-0.5 mb-3 text-sm text-slate-500">Reprend à l&apos;identique le planning du {formatWeekRange(addWeeks(week, -1))}.</p>
            <Button size="sm" onClick={copyPrev}>
              Copier
            </Button>
          </div>
        </Card>
        <Card className="flex items-start gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Save size={18} />
          </div>
          <div className="flex-1">
            <div className="font-medium">Enregistrer comme modèle</div>
            <p className="mt-0.5 mb-3 text-sm text-slate-500">Sauvegardez la semaine affichée (ou plusieurs semaines pour un roulement).</p>
            <Button size="sm" onClick={() => setSaving(true)}>
              Enregistrer
            </Button>
          </div>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-500">Vos modèles</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {state.templates.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start gap-3">
              <div className={cx("flex h-10 w-10 items-center justify-center rounded-xl", t.weeks.length > 1 ? "bg-violet-50 text-violet-600" : "bg-slate-100 text-slate-600")}>
                {t.weeks.length > 1 ? <Repeat size={18} /> : <LayoutTemplate size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{t.name}</div>
                <div className="text-xs text-slate-500">
                  {t.weeks.length === 1 ? "Semaine type" : `Roulement sur ${t.weeks.length} semaines`}
                </div>
              </div>
              <button
                aria-label="Supprimer le modèle"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 sm:h-9 sm:w-9"
                onClick={() => {
                  update((s) => ({ ...s, templates: s.templates.filter((x) => x.id !== t.id) }));
                  toast("Modèle supprimé");
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="my-4 flex gap-1">
              {t.weeks.map((w, i) => (
                <div key={i} className="flex-1 rounded-lg bg-slate-50 px-2 py-1.5 text-center">
                  <div className="text-[11px] text-slate-500">Semaine {String.fromCharCode(65 + i)}</div>
                  <div className="text-sm font-semibold">{w.length} créneaux</div>
                </div>
              ))}
            </div>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={() => {
                update((s) => applyTemplate(s, t, s.currentWeek));
                toast(t.weeks.length === 1 ? `« ${t.name} » appliqué` : `Roulement appliqué du ${formatWeekRange(week).split(" – ")[0]} sur ${t.weeks.length} semaines`);
              }}
            >
              Appliquer en 1 clic
            </Button>
          </Card>
        ))}
      </div>

      <Modal
        open={saving}
        onClose={() => setSaving(false)}
        title="Enregistrer comme modèle"
        footer={
          <>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => setSaving(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              disabled={!name.trim()}
              onClick={() => {
                update((s) => ({ ...s, templates: [...s.templates, makeTemplate(s, name.trim(), s.currentWeek, weeks)] }));
                setSaving(false);
                setName("");
                toast("Modèle enregistré");
              }}
            >
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Nom du modèle">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Semaine d'été" autoFocus />
          </Field>
          <Field label="Type" hint={weeks > 1 ? `Les ${weeks} semaines à partir du ${formatWeekRange(week).split(" – ")[0]} seront enregistrées.` : undefined}>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWeeks(n)}
                  className={cx("rounded-xl border px-3 py-2.5 text-sm", weeks === n ? "border-brand-500 bg-brand-50 font-medium text-brand-700" : "border-slate-200 text-slate-600")}
                >
                  {n === 1 ? "Semaine type" : `Roulement ${n} sem.`}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
