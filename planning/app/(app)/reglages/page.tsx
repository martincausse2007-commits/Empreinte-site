"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList, Download, LogOut, MoreHorizontal, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { uid, useApp } from "@/lib/store";
import { activity } from "@/lib/presets";
import { rulesOf } from "@/lib/rules";
import { holidaysOfYear, isHolidayClosed } from "@/lib/holidays";
import { download, exportAll } from "@/lib/export";
import { toISODate } from "@/lib/time";
import { COLOR_ORDER, POST_COLORS } from "@/lib/colors";
import type { Rules, Service } from "@/lib/types";

const BREAKS = [0, 20, 30, 45, 60, 90];
import { BackButton, Button, Card, Field, Modal, PageHeader, Toggle, Stepper, TimeSelect, buttonClass, cx, inputClass, useToast } from "@/components/ui";
import { Question, RulesFields, Segmented } from "@/components/setup/SetupWizard";

export default function SettingsPage() {
  const { state, update, reset, mode, userEmail, signOut } = useApp();
  const toast = useToast();
  const router = useRouter();
  const rules = rulesOf(state);
  const [options, setOptions] = useState<string | null>(null);
  // Les 11 prochains jours fériés (à partir d'aujourd'hui)
  const today = toISODate(new Date());
  const year = new Date().getFullYear();
  const upcoming = [...holidaysOfYear(year), ...holidaysOfYear(year + 1)].filter((h) => h.date >= today).slice(0, 11);
  const optionsSv = state.services.find((x) => x.id === options);
  const setRules = (r: Partial<Rules>) => update((s) => ({ ...s, rules: { ...rulesOf(s), ...r } }));

  return (
    <div className="max-w-3xl">
      <BackButton fallback="/planning" />
      <div className="mt-2">
        <PageHeader title="Réglages" />
      </div>

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
            <Link href="/configuration" className={buttonClass("secondary", "sm")}>
              <ClipboardList size={14} /> Refaire le questionnaire
            </Link>
          </div>
        </div>
      </Card>

      <Link href="/besoins" className="mb-4 flex min-h-11 items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-xs hover:bg-slate-50">
        <span>
          <span className="block font-semibold">Besoins</span>
          <span className="block text-sm text-slate-600">Nombre de personnes par jour, créneau et poste</span>
        </span>
        <ChevronRight size={18} className="text-slate-500" />
      </Link>

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
              <button aria-label="Supprimer le poste" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600" onClick={() => update((s) => ({ ...s, posts: s.posts.filter((x) => x.id !== p.id) }))}>
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
          {state.services.map((sv) => {
            const setSv = (p: Partial<Service>) => update((s) => ({ ...s, services: s.services.map((x) => (x.id === sv.id ? { ...x, ...p } : x)) }));
            return (
              // Une seule ligne, même sur téléphone : nom, début, fin, puis options
              <div key={sv.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto] sm:gap-2">
                <input aria-label="Nom du créneau" className={cx(inputClass, "min-w-0")} value={sv.name} onChange={(e) => setSv({ name: e.target.value })} />
                <TimeSelect className="w-[78px]" value={sv.start} onChange={(v) => setSv({ start: v })} />
                <span className="hidden text-slate-500 sm:inline">–</span>
                <TimeSelect className="w-[78px]" value={sv.end} onChange={(v) => setSv({ end: v })} />
                <select
                  aria-label="Pause"
                  className="hidden h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm sm:block"
                  value={sv.breakMinutes ?? 0}
                  onChange={(e) => setSv({ breakMinutes: Number(e.target.value) || undefined })}
                >
                  {BREAKS.map((m) => (
                    <option key={m} value={m}>
                      {m ? `Pause ${m} min` : "Sans pause"}
                    </option>
                  ))}
                </select>
                <button
                  aria-label={`Options du créneau ${sv.name}`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 sm:hidden"
                  onClick={() => setOptions(sv.id)}
                >
                  <MoreHorizontal size={18} />
                </button>
                <button
                  aria-label="Supprimer le créneau"
                  className="hidden h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 sm:flex"
                  onClick={() => update((s) => ({ ...s, services: s.services.filter((x) => x.id !== sv.id) }))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {optionsSv && (
        <Modal open onClose={() => setOptions(null)} title={`Créneau « ${optionsSv.name} »`}>
          <div className="space-y-4">
            <Field label="Pause non payée">
              <select
                className={inputClass}
                value={optionsSv.breakMinutes ?? 0}
                onChange={(e) => update((s) => ({ ...s, services: s.services.map((x) => (x.id === optionsSv.id ? { ...x, breakMinutes: Number(e.target.value) || undefined } : x)) }))}
              >
                {BREAKS.map((m) => (
                  <option key={m} value={m}>
                    {m ? `${m} min` : "Sans pause"}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              variant="danger"
              className="w-full"
              onClick={() => {
                update((s) => ({ ...s, services: s.services.filter((x) => x.id !== optionsSv.id) }));
                setOptions(null);
                toast("Créneau supprimé");
              }}
            >
              <Trash2 size={16} /> Supprimer ce créneau
            </Button>
          </div>
        </Modal>
      )}

      <Card className="mb-4 p-5">
        <h2 className="mb-1 font-semibold">Jours fériés</h2>
        <p className="mb-4 text-sm text-slate-600">
          Calculés automatiquement chaque année. Un jour fermé n&apos;a aucun besoin : la génération n&apos;y place personne. Le 1er mai a des règles particulières : vérifiez votre convention collective.
        </p>
        <ul className="divide-y divide-slate-100">
          {upcoming.map((h) => {
            const closed = isHolidayClosed(state, h.id);
            return (
              <li key={h.id} className="flex min-h-11 items-center gap-3 py-1.5">
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{h.label}</span>
                  <span className="text-slate-600"> · {new Date(h.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                </span>
                <span className={cx("text-xs font-medium", closed ? "text-slate-700" : "text-slate-600")}>{closed ? "Fermé" : "Ouvert"}</span>
                <Toggle
                  checked={!closed}
                  label={`${h.label} : ouvert`}
                  onChange={(open) =>
                    update((s) => {
                      const cur = new Set(s.establishment.closedHolidays ?? []);
                      if (open) cur.delete(h.id);
                      else cur.add(h.id);
                      return { ...s, establishment: { ...s.establishment, closedHolidays: [...cur] } };
                    })
                  }
                />
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="mb-4 p-5">
        <h2 className="mb-1 font-semibold">Vos données</h2>
        <p className="mb-4 text-sm text-slate-600">Téléchargez l&apos;intégralité des données de l&apos;établissement (équipe, plannings, absences, réglages) dans un fichier lisible.</p>
        <Button
          onClick={() => {
            download(`quinzo-export-${new Date().toISOString().slice(0, 10)}.json`, exportAll(state), "application/json");
            toast("Export téléchargé");
          }}
        >
          <Download size={16} /> Exporter toutes les données
        </Button>
      </Card>

      {mode === "cloud" ? (
        <Card className="p-5">
          <h2 className="mb-1 font-semibold">Compte</h2>
          <p className="mb-4 text-sm text-slate-600">
            Connecté avec <b>{userEmail}</b>. Vos données sont enregistrées automatiquement dans une base hébergée dans l&apos;Union européenne.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/nouveau-mot-de-passe" className={buttonClass()}>
              Changer de mot de passe
            </Link>
            <Button
              variant="ghost"
              onClick={async () => {
                await signOut();
                router.push("/connexion");
              }}
            >
              <LogOut size={16} /> Se déconnecter
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-5">
          <h2 className="mb-1 font-semibold">Démo</h2>
          <p className="mb-4 text-sm text-slate-600">Vos données restent sur cet appareil. Créez un compte pour les retrouver partout et les partager.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/inscription?depuis=demo" className={buttonClass("primary")}>
              Créer un compte et garder ces données
            </Link>
            <Button
              onClick={() => {
                reset();
                toast("Démo réinitialisée");
                router.push("/planning");
              }}
            >
              <RotateCcw size={16} /> Réinitialiser la démo
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
