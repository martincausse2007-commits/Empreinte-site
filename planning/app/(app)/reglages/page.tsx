"use client";

import Link from "next/link";
import { ClipboardList, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { uid, useApp } from "@/lib/store";
import { activity } from "@/lib/presets";
import { rulesOf } from "@/lib/rules";
import { COLOR_ORDER, POST_COLORS } from "@/lib/colors";
import type { Rules } from "@/lib/types";
import { Button, Card, Field, PageHeader, Stepper, TimeSelect, cx, inputClass, useToast } from "@/components/ui";
import { Question, RulesFields, Segmented } from "@/components/setup/SetupWizard";

export default function SettingsPage() {
  const { state, update, reset } = useApp();
  const toast = useToast();
  const router = useRouter();
  const rules = rulesOf(state);
  const setRules = (r: Partial<Rules>) => update((s) => ({ ...s, rules: { ...rulesOf(s), ...r } }));

  return (
    <div className="max-w-3xl">
      <PageHeader title="Réglages" />

      <Card className="mb-4 p-5">
        <h2 className="mb-4 font-semibold">Établissement</h2>
        <div className="space-y-4">
          <Field label="Nom">
            <input
              id="settings-name"
              className={inputClass}
              value={state.establishment.name}
              onChange={(e) => update((s) => ({ ...s, establishment: { ...s.establishment, name: e.target.value } }))}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <div className="text-sm font-medium">{activity(state.establishment.type).label}</div>
              <div className="text-xs text-slate-500">Horaires, organisation, postes et équipe définis par le questionnaire</div>
            </div>
            <Link href="/configuration">
              <Button size="sm">
                <ClipboardList size={14} /> Refaire le questionnaire
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <Card className="mb-4 px-5 pt-5 pb-2">
        <h2 className="font-semibold">Règles du planning</h2>
        <p className="text-sm text-slate-500">Appliquées par la génération automatique et par les alertes.</p>
        <div className="divide-y divide-slate-100">
          <RulesFields rules={rules} setRules={setRules} />
          <Question title="Coupures (deux créneaux le même jour)">
            <Segmented
              value={rules.splitShifts}
              onChange={(v) => setRules({ splitShifts: v })}
              options={[
                { value: "never", label: "Jamais" },
                { value: "limited", label: "Parfois" },
                { value: "often", label: "Souvent" },
              ]}
            />
          </Question>
          {rules.splitShifts === "limited" && (
            <Question title="Coupures maximum par semaine" aside={<Stepper value={rules.maxSplitsPerWeek} onChange={(v) => setRules({ maxSplitsPerWeek: v })} min={1} max={6} />} />
          )}
          {rules.splitShifts !== "never" && (
            <Question title="Amplitude maximum d'une journée (h)" aside={<Stepper value={rules.maxAmplitudeHours} onChange={(v) => setRules({ maxAmplitudeHours: v })} min={8} max={15} />} />
          )}
        </div>
      </Card>

      <Card className="mb-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Postes</h2>
          <Button size="sm" onClick={() => update((s) => ({ ...s, posts: [...s.posts, { id: uid("p"), name: "Nouveau poste", color: COLOR_ORDER[s.posts.length % COLOR_ORDER.length] }] }))}>
            <Plus size={14} /> Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {state.posts.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="flex gap-1">
                {COLOR_ORDER.map((c) => (
                  <button
                    key={c}
                    aria-label={c}
                    onClick={() => update((s) => ({ ...s, posts: s.posts.map((x) => (x.id === p.id ? { ...x, color: c } : x)) }))}
                    className={cx("hidden h-5 w-5 rounded-full sm:block", POST_COLORS[c].dot, p.color === c ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-40 hover:opacity-100")}
                  />
                ))}
                <span className={cx("h-5 w-5 rounded-full sm:hidden", POST_COLORS[p.color].dot)} />
              </div>
              <input className={inputClass} value={p.name} onChange={(e) => update((s) => ({ ...s, posts: s.posts.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)) }))} />
              <button aria-label="Supprimer le poste" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => update((s) => ({ ...s, posts: s.posts.filter((x) => x.id !== p.id) }))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4 p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold">Créneaux types</h2>
          <Button size="sm" onClick={() => update((s) => ({ ...s, services: [...s.services, { id: uid("sv"), name: "Nouveau créneau", start: "09:00", end: "13:00" }] }))}>
            <Plus size={14} /> Ajouter
          </Button>
        </div>
        <p className="mb-4 text-sm text-slate-500">Les grandes plages de travail de la journée, utilisées pour les besoins et la génération.</p>
        <div className="space-y-2">
          {state.services.map((sv) => (
            <div key={sv.id} className="flex flex-wrap items-center gap-2">
              <input className={cx(inputClass, "min-w-0 flex-1 basis-32")} value={sv.name} onChange={(e) => update((s) => ({ ...s, services: s.services.map((x) => (x.id === sv.id ? { ...x, name: e.target.value } : x)) }))} />
              <TimeSelect value={sv.start} onChange={(v) => update((s) => ({ ...s, services: s.services.map((x) => (x.id === sv.id ? { ...x, start: v } : x)) }))} />
              <span className="text-slate-400">–</span>
              <TimeSelect value={sv.end} onChange={(v) => update((s) => ({ ...s, services: s.services.map((x) => (x.id === sv.id ? { ...x, end: v } : x)) }))} />
              <select
                aria-label="Pause"
                className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                value={sv.breakMinutes ?? 0}
                onChange={(e) => update((s) => ({ ...s, services: s.services.map((x) => (x.id === sv.id ? { ...x, breakMinutes: Number(e.target.value) || undefined } : x)) }))}
              >
                {[0, 20, 30, 45, 60, 90].map((m) => (
                  <option key={m} value={m}>
                    {m ? `Pause ${m} min` : "Sans pause"}
                  </option>
                ))}
              </select>
              <button aria-label="Supprimer le créneau" className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => update((s) => ({ ...s, services: s.services.filter((x) => x.id !== sv.id) }))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Démo</h2>
        <p className="mb-4 text-sm text-slate-500">Remet le restaurant d&apos;exemple (10 employés).</p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              reset();
              toast("Démo réinitialisée");
              router.push("/planning");
            }}
          >
            <RotateCcw size={16} /> Réinitialiser la démo
          </Button>
          <Button variant="ghost" onClick={() => router.push("/connexion")}>
            Se déconnecter
          </Button>
        </div>
      </Card>
    </div>
  );
}
