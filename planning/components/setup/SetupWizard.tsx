"use client";

// Questionnaire de configuration (5 à 10 minutes) : le gérant décrit comment
// fonctionne vraiment son établissement, et le planning s'y adapte.

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Briefcase,
  Check,
  Coffee,
  Croissant,
  Plus,
  Scissors,
  ShoppingBasket,
  Sparkles,
  Store,
  Trash2,
  UtensilsCrossed,
  Wand2,
  X,
} from "lucide-react";
import { Logo } from "../Logo";
import { Button, Card, Stepper, TimeSelect, Toggle, cx, inputClass, useToast } from "../ui";
import { useApp } from "@/lib/store";
import { ACTIVITIES, ORGANISATIONS, activity } from "@/lib/presets";
import { activePosts, draftFor, exampleTeam, neededHours, rebuildServices, defaultNeeds, sid, stateFromDraft, type SetupDraft } from "@/lib/setup";
import { generateWeek } from "@/lib/generate";
import { serviceActive, shiftHours } from "@/lib/rules";
import { COLOR_ORDER, POST_COLORS } from "@/lib/colors";
import { DAYS, DAYS_SHORT, formatHours, formatTime } from "@/lib/time";
import type { ActivityId, Rules, Service } from "@/lib/types";

const ICONS: Record<ActivityId, typeof Store> = {
  restaurant: UtensilsCrossed,
  bar: Coffee,
  boulangerie: Croissant,
  boutique: Store,
  supermarche: ShoppingBasket,
  beaute: Scissors,
  hotel: BedDouble,
  agence: Briefcase,
  autre: Sparkles,
};

const STEPS = ["Activité", "Horaires", "Organisation", "Postes", "Besoins", "Règles", "Équipe", "Récapitulatif"];

export function SetupWizard() {
  const router = useRouter();
  const { replace } = useApp();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<SetupDraft>(() => draftFor("restaurant"));

  /** Modifie le brouillon ; si les horaires ou l'organisation changent, on recalcule les créneaux. */
  function patch(p: Partial<SetupDraft>, rebuild = false) {
    setD((cur) => {
      const next = { ...cur, ...p };
      if (rebuild) {
        next.services = rebuildServices(next);
        next.needs = defaultNeeds(next);
      }
      return next;
    });
  }
  const setRules = (r: Partial<Rules>, rebuild = false) => patch({ rules: { ...d.rules, ...r } }, rebuild);

  const canNext = [
    true,
    d.opening.some((x) => x.length > 0),
    d.services.length > 0,
    activePosts(d).length > 0,
    true,
    true,
    true,
    true,
  ][step];

  function finish() {
    const state = stateFromDraft(d);
    if (state.employees.length) {
      const res = generateWeek(state);
      state.plans[state.currentWeek] = res.shifts;
      toast(res.unfilled ? `Première semaine générée (${res.unfilled} place${res.unfilled > 1 ? "s" : ""} à pourvoir)` : "Votre première semaine est prête");
    } else toast("Établissement créé. Ajoutez votre équipe pour générer le planning.");
    replace(state);
    router.push(state.employees.length ? "/planning" : "/equipe");
  }

  const next = () => (step < STEPS.length - 1 ? (setStep(step + 1), window.scrollTo(0, 0)) : finish());
  const back = () => (step > 0 ? (setStep(step - 1), window.scrollTo(0, 0)) : router.push("/"));

  return (
    <div className="min-h-dvh bg-white pb-28">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Logo />
          <span className="text-xs font-medium text-slate-500">
            Étape {step + 1} sur {STEPS.length} · {STEPS[step]}
          </span>
        </div>
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-brand-600 transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-6 sm:pt-10">
        {step === 0 && <StepActivity d={d} setD={setD} />}
        {step === 1 && <StepOpening d={d} patch={patch} />}
        {step === 2 && <StepOrganisation d={d} patch={patch} setRules={setRules} />}
        {step === 3 && <StepPosts d={d} patch={patch} />}
        {step === 4 && <StepNeeds d={d} patch={patch} />}
        {step === 5 && <StepRules d={d} setRules={setRules} />}
        {step === 6 && <StepTeam d={d} patch={patch} />}
        {step === 7 && <StepSummary d={d} goTo={setStep} />}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <Button variant="ghost" onClick={back}>
            <ArrowLeft size={16} /> {step === 0 ? "Quitter" : "Retour"}
          </Button>
          <div className="flex-1" />
          <Button variant="primary" size="lg" onClick={next} disabled={!canNext}>
            {step === STEPS.length - 1 ? (
              <>
                <Wand2 size={17} /> Créer mon planning
              </>
            ) : (
              <>
                Continuer <ArrowRight size={17} />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}

// ---- Éléments communs --------------------------------------------------------

function Title({ title, text }: { title: string; text: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-[28px]">{title}</h1>
      <p className="mt-2 text-[15px] text-slate-500">{text}</p>
    </div>
  );
}

export function Question({ title, hint, children, aside }: { title: string; hint?: ReactNode; children?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[15px] font-medium">{title}</div>
          {hint && <div className="mt-0.5 text-[13px] text-slate-500">{hint}</div>}
        </div>
        {aside}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function Choice({ active, onClick, title, text, icon }: { active: boolean; onClick: () => void; title: string; text?: string; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition",
        active ? "border-brand-500 bg-brand-50/60 ring-4 ring-brand-500/10" : "border-slate-200 hover:bg-slate-50",
      )}
    >
      {icon && <span className={cx("mt-0.5", active ? "text-brand-600" : "text-slate-500")}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        {text && <span className="mt-0.5 block text-[13px] text-slate-500">{text}</span>}
      </span>
      <span className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", active ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300")}>
        {active && <Check size={12} strokeWidth={3} />}
      </span>
    </button>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx("rounded-lg px-3.5 py-1.5 text-sm font-medium transition", value === o.value ? "bg-white shadow-sm" : "text-slate-600")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const MINUTES = [0, 15, 30, 45, 60, 90];

// ---- 1. Activité -------------------------------------------------------------

function StepActivity({ d, setD }: { d: SetupDraft; setD: (d: SetupDraft) => void }) {
  return (
    <>
      <Title title="Parlez-nous de votre établissement" text="On prépare des réglages adaptés à votre secteur. Vous pourrez tout modifier aux étapes suivantes." />
      <label className="mb-6 block">
        <span className="mb-1.5 block text-sm font-medium">Nom de l&apos;établissement</span>
        <input
          id="setup-name"
          className={inputClass}
          value={d.name}
          onChange={(e) => setD({ ...d, name: e.target.value })}
          placeholder="Ex. Le Comptoir des Halles"
        />
      </label>
      <div className="mb-2 text-sm font-medium">Votre activité</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ACTIVITIES.map((a) => {
          const Icon = ICONS[a.id];
          const active = d.activity === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setD(draftFor(a.id, d.name))}
              className={cx(
                "rounded-xl border p-3 text-left transition",
                active ? "border-brand-500 bg-brand-50/60 ring-4 ring-brand-500/10" : "border-slate-200 hover:bg-slate-50",
              )}
            >
              <Icon size={20} className={active ? "text-brand-600" : "text-slate-500"} />
              <div className="mt-2 text-sm font-semibold">{a.label}</div>
              <div className="text-xs text-slate-500">{a.hint}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---- 2. Horaires d'ouverture ---------------------------------------------------

function StepOpening({ d, patch }: { d: SetupDraft; patch: (p: Partial<SetupDraft>, rebuild?: boolean) => void }) {
  const setDay = (day: number, ranges: SetupDraft["opening"][number]) => patch({ opening: d.opening.map((x, i) => (i === day ? ranges : x)) }, true);
  const firstOpen = d.opening.find((x) => x.length) ?? [];

  return (
    <>
      <Title title="Vos horaires d'ouverture" text="Les heures où vos clients peuvent venir. Ajoutez une deuxième plage si vous fermez en milieu de journée." />
      <Card className="divide-y divide-slate-100">
        {DAYS.map((name, day) => {
          const ranges = d.opening[day];
          const open = ranges.length > 0;
          return (
            <div key={day} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex w-36 items-center gap-3">
                <Toggle checked={open} label={`${name} ouvert`} onChange={(v) => setDay(day, v ? (firstOpen.length ? firstOpen.map((r) => ({ ...r })) : [{ start: "09:00", end: "18:00" }]) : [])} />
                <span className={cx("text-sm font-medium", !open && "text-slate-400")}>{name}</span>
              </div>
              {open ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {ranges.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      {i > 0 && <span className="px-1 text-xs text-slate-400">puis</span>}
                      <TimeSelect value={r.start} onChange={(v) => setDay(day, ranges.map((x, j) => (j === i ? { ...x, start: v } : x)))} />
                      <span className="text-slate-400">–</span>
                      <TimeSelect value={r.end} onChange={(v) => setDay(day, ranges.map((x, j) => (j === i ? { ...x, end: v } : x)))} />
                      {ranges.length > 1 && (
                        <button type="button" aria-label="Retirer la plage" onClick={() => setDay(day, ranges.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                          <X size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                  {ranges.length < 2 && (
                    <button
                      type="button"
                      onClick={() => setDay(day, [...ranges, { start: "19:00", end: "22:30" }])}
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
                    >
                      + 2e plage horaire
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-sm text-slate-400">Fermé</span>
              )}
            </div>
          );
        })}
      </Card>
      <button
        type="button"
        onClick={() => patch({ opening: d.opening.map((x) => (x.length ? firstOpen.map((r) => ({ ...r })) : [])) }, true)}
        className="mt-2 text-sm font-medium text-brand-600"
      >
        Mettre les mêmes horaires sur tous les jours ouverts
      </button>
      <p className="mt-1 text-xs text-slate-400">Astuce : une fin égale au début signifie « ouvert 24 h/24 ».</p>

      <div className="mt-6 divide-y divide-slate-100">
        <Question title="Mise en place avant l'ouverture" hint="Votre équipe arrive combien de temps avant les clients ?">
          <Segmented value={d.prepMinutes} onChange={(v) => patch({ prepMinutes: v }, true)} options={MINUTES.map((m) => ({ value: m, label: m ? `${m} min` : "Aucune" }))} />
        </Question>
        <Question title="Rangement après la fermeture" hint="Nettoyage, caisse, fermeture…">
          <Segmented value={d.closeMinutes} onChange={(v) => patch({ closeMinutes: v }, true)} options={MINUTES.map((m) => ({ value: m, label: m ? `${m} min` : "Aucun" }))} />
        </Question>
      </div>
    </>
  );
}

// ---- 3. Organisation des journées ------------------------------------------------

function StepOrganisation({
  d,
  patch,
  setRules,
}: {
  d: SetupDraft;
  patch: (p: Partial<SetupDraft>, rebuild?: boolean) => void;
  setRules: (r: Partial<Rules>, rebuild?: boolean) => void;
}) {
  const setService = (id: string, p: Partial<Service>) => patch({ services: d.services.map((s) => (s.id === id ? { ...s, ...p } : s)) });

  return (
    <>
      <Title title="Comment s'organisent vos journées ?" text="C'est ce qui change le plus d'un établissement à l'autre. Choisissez ce qui ressemble le plus à chez vous." />
      <div className="space-y-2">
        {ORGANISATIONS.map((o) => (
          <Choice key={o.id} active={d.organisation === o.id} onClick={() => patch({ organisation: o.id }, true)} title={o.label} text={`${o.text} ${o.example}.`} />
        ))}
      </div>

      {d.organisation === "equipes" && (
        <Question title="Combien d'équipes par jour ?">
          <Segmented value={d.teams} onChange={(v) => patch({ teams: v }, true)} options={[{ value: 2, label: "2 équipes" }, { value: 3, label: "3 équipes" }]} />
        </Question>
      )}

      <div className="mt-6 mb-2 flex items-end justify-between">
        <div>
          <div className="text-[15px] font-medium">Vos créneaux types</div>
          <div className="text-[13px] text-slate-500">Calculés à partir de vos horaires. Ajustez-les si besoin.</div>
        </div>
        {d.organisation === "libre" && (
          <Button
            size="sm"
            onClick={() => patch({ services: [...d.services, { id: sid("sv"), name: "Nouveau créneau", start: "09:00", end: "13:00" }] })}
          >
            <Plus size={14} /> Ajouter
          </Button>
        )}
      </div>
      <Card className="divide-y divide-slate-100">
        {d.services.length === 0 && <p className="p-4 text-sm text-slate-500">Aucun créneau : indiquez au moins un jour ouvert à l&apos;étape précédente.</p>}
        {d.services.map((sv) => {
          const special = Object.keys(sv.overrides ?? {}).map(Number);
          return (
            <div key={sv.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <input className={cx(inputClass, "h-10 min-w-0 flex-1 basis-32")} value={sv.name} onChange={(e) => setService(sv.id, { name: e.target.value })} aria-label="Nom du créneau" />
                <TimeSelect value={sv.start} onChange={(v) => setService(sv.id, { start: v })} />
                <span className="text-slate-400">–</span>
                <TimeSelect value={sv.end} onChange={(v) => setService(sv.id, { end: v })} />
                <select
                  aria-label="Pause"
                  className="h-10 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                  value={sv.breakMinutes ?? 0}
                  onChange={(e) => setService(sv.id, { breakMinutes: Number(e.target.value) || undefined })}
                >
                  {[0, 20, 30, 45, 60, 90].map((m) => (
                    <option key={m} value={m}>
                      {m ? `Pause ${m} min` : "Sans pause"}
                    </option>
                  ))}
                </select>
                {d.organisation === "libre" && (
                  <button type="button" aria-label="Supprimer" onClick={() => patch({ services: d.services.filter((s) => s.id !== sv.id) })} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="mt-1.5 text-xs text-slate-500">
                {sv.days ? `${sv.days.map((x) => DAYS_SHORT[x]).join(", ")}` : "Tous les jours"}
                {special.length > 0 && <> · horaires adaptés le {special.map((x) => `${DAYS[x].toLowerCase()} (${formatTime(sv.overrides![x].start)}–${formatTime(sv.overrides![x].end)})`).join(", ")}</>}
                {" · "}
                {formatHours(shiftHours({ start: sv.start, end: sv.end, breakMinutes: sv.breakMinutes }))} de travail
              </div>
            </div>
          );
        })}
      </Card>

      <div className="mt-6 divide-y divide-slate-100">
        <Question title="Vos employés font-ils des coupures ?" hint="Une coupure = deux créneaux le même jour avec une pause entre les deux (ex. midi et soir).">
          <div className="grid gap-2 sm:grid-cols-3">
            <Choice active={d.rules.splitShifts === "never"} onClick={() => setRules({ splitShifts: "never" })} title="Jamais" text="Un seul créneau par jour" />
            <Choice active={d.rules.splitShifts === "limited"} onClick={() => setRules({ splitShifts: "limited" })} title="Parfois" text="Avec un maximum par semaine" />
            <Choice active={d.rules.splitShifts === "often"} onClick={() => setRules({ splitShifts: "often" })} title="Souvent" text="Pour libérer plus de jours" />
          </div>
        </Question>
        {d.rules.splitShifts === "limited" && (
          <Question title="Coupures maximum par semaine et par personne" aside={<Stepper value={d.rules.maxSplitsPerWeek} onChange={(v) => setRules({ maxSplitsPerWeek: v })} min={1} max={6} />} />
        )}
        {d.rules.splitShifts !== "never" && (
          <Question
            title="Amplitude maximum d'une journée"
            hint="Du premier arrivé au dernier parti, pause comprise (13 h en général)."
            aside={
              <span className="flex items-center gap-2">
                <Stepper value={d.rules.maxAmplitudeHours} onChange={(v) => setRules({ maxAmplitudeHours: v })} min={8} max={15} />
                <span className="text-sm text-slate-500">h</span>
              </span>
            }
          />
        )}
      </div>
    </>
  );
}

// ---- 4. Postes ---------------------------------------------------------------

function StepPosts({ d, patch }: { d: SetupDraft; patch: (p: Partial<SetupDraft>) => void }) {
  const [name, setName] = useState("");
  const add = () => {
    if (!name.trim()) return;
    patch({ posts: [...d.posts, { id: sid("p"), name: name.trim(), color: COLOR_ORDER[d.posts.length % COLOR_ORDER.length], selected: true }] });
    setName("");
  };
  return (
    <>
      <Title title="Quels sont les postes dans votre équipe ?" text="Un poste = un rôle à tenir pendant un créneau. Une même personne pourra tenir plusieurs postes." />
      <Card className="divide-y divide-slate-100">
        {d.posts.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
            <Toggle checked={p.selected} label={p.name} onChange={(v) => patch({ posts: d.posts.map((x) => (x.id === p.id ? { ...x, selected: v } : x)) })} />
            <span className={cx("h-2.5 w-2.5 shrink-0 rounded-full", POST_COLORS[p.color].dot)} />
            <input
              className={cx("h-9 min-w-0 flex-1 rounded-lg border border-transparent px-2 text-sm hover:border-slate-200 focus:border-brand-500 focus:outline-none", !p.selected && "text-slate-400")}
              value={p.name}
              onChange={(e) => patch({ posts: d.posts.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)) })}
              aria-label="Nom du poste"
            />
          </div>
        ))}
      </Card>
      <div className="mt-3 flex gap-2">
        <input className={inputClass} placeholder="Ajouter un poste (ex. Livraison)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add} disabled={!name.trim()}>
          <Plus size={16} /> Ajouter
        </Button>
      </div>
    </>
  );
}

// ---- 5. Besoins ----------------------------------------------------------------

function StepNeeds({ d, patch }: { d: SetupDraft; patch: (p: Partial<SetupDraft>) => void }) {
  const posts = activePosts(d);
  const total = Object.values(neededHours(d)).reduce((a, b) => a + b, 0);
  const setNeed = (key: string, field: "weekday" | "weekend", v: number) =>
    patch({ needs: { ...d.needs, [key]: { ...(d.needs[key] ?? { weekday: 0, weekend: 0 }), [field]: v } } });
  const hasWeekend = d.services.some((sv) => serviceActive(sv, 5) || serviceActive(sv, 6));
  const hasWeekday = d.services.some((sv) => [0, 1, 2, 3, 4].some((x) => serviceActive(sv, x)));

  return (
    <>
      <Title title="Combien de personnes faut-il ?" text="Pour chaque créneau, le nombre de personnes nécessaires par poste. Vous affinerez jour par jour plus tard dans « Besoins »." />
      <div className="space-y-3">
        {d.services.map((sv) => (
          <Card key={sv.id} className="overflow-hidden">
            <div className="flex items-baseline justify-between border-b border-slate-100 px-4 py-3">
              <span className="font-semibold">{sv.name}</span>
              <span className="text-sm text-slate-500">
                {formatTime(sv.start)} – {formatTime(sv.end)}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2 px-4 py-3">
              <span />
              <span className="w-[104px] text-center text-xs font-medium text-slate-500">{hasWeekday ? "En semaine" : ""}</span>
              <span className="w-[104px] text-center text-xs font-medium text-slate-500">{hasWeekend ? "Week-end" : ""}</span>
              {posts.map((p) => {
                const key = `${sv.id}|${p.id}`;
                const v = d.needs[key] ?? { weekday: 0, weekend: 0 };
                return (
                  <div key={p.id} className="contents">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <span className={cx("h-2 w-2 shrink-0 rounded-full", POST_COLORS[p.color].dot)} />
                      <span className="truncate">{p.name}</span>
                    </span>
                    <span className="flex justify-center">{hasWeekday && <Stepper value={v.weekday} onChange={(x) => setNeed(key, "weekday", x)} max={30} />}</span>
                    <span className="flex justify-center">{hasWeekend && <Stepper value={v.weekend} onChange={(x) => setNeed(key, "weekend", x)} max={30} />}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
        Total : <b>{formatHours(total)}</b> de travail à planifier chaque semaine.
      </div>
    </>
  );
}

// ---- 6. Règles -----------------------------------------------------------------

function StepRules({ d, setRules }: { d: SetupDraft; setRules: (r: Partial<Rules>) => void }) {
  return (
    <>
      <Title title="Vos règles de planning" text="Le planning généré les respectera toujours, et vous serez alerté si une modification les enfreint." />
      <RulesFields rules={d.rules} setRules={setRules} />
    </>
  );
}

/** Réglages des règles, réutilisés dans la page « Réglages ». */
export function RulesFields({ rules: r, setRules }: { rules: Rules; setRules: (r: Partial<Rules>) => void }) {
  const unit = (v: ReactNode) => (
    <span className="flex items-center gap-2">
      {v}
      <span className="text-sm text-slate-500">h</span>
    </span>
  );
  return (
    <div className="divide-y divide-slate-100">
      <Question title="Jours de repos par semaine">
        <Segmented value={r.restDaysPerWeek} onChange={(v) => setRules({ restDaysPerWeek: v })} options={[{ value: 1, label: "1 jour" }, { value: 2, label: "2 jours" }, { value: 3, label: "3 jours" }]} />
      </Question>
      <Question title="Jours de repos à la suite" hint="Par exemple dimanche + lundi, plutôt que mardi et jeudi." aside={<Toggle checked={r.consecutiveRestDays} onChange={(v) => setRules({ consecutiveRestDays: v })} label="Jours de repos à la suite" />} />
      <Question title="Repos minimum entre deux journées" hint="11 h minimum en France (Code du travail)." aside={unit(<Stepper value={r.minRestHours} onChange={(v) => setRules({ minRestHours: v })} min={8} max={16} />)} />
      <Question
        title="Temps de travail maximum par jour"
        hint="10 h en règle générale ; certaines conventions collectives permettent davantage."
        aside={unit(<Stepper value={r.maxHoursPerDay} onChange={(v) => setRules({ maxHoursPerDay: v })} min={4} max={13} />)}
      />
      <Question title="Heures au-delà du contrat" hint="0 = jamais d'heures supplémentaires dans le planning généré." aside={unit(<Stepper value={r.overtimeHours} onChange={(v) => setRules({ overtimeHours: v })} min={0} max={15} />)} />
      <Question title="Répartir les week-ends équitablement" hint="Ceux qui ont beaucoup travaillé le week-end passent en dernier." aside={<Toggle checked={r.weekendFairness} onChange={(v) => setRules({ weekendFairness: v })} label="Équité des week-ends" />} />
    </div>
  );
}

// ---- 7. Équipe -----------------------------------------------------------------

function StepTeam({ d, patch }: { d: SetupDraft; patch: (p: Partial<SetupDraft>) => void }) {
  const posts = activePosts(d);
  const needed = neededHours(d);
  const setEmp = (id: string, p: Partial<SetupDraft["employees"][number]>) => patch({ employees: d.employees.map((e) => (e.id === id ? { ...e, ...p } : e)) });
  const add = () => patch({ employees: [...d.employees, { id: sid("e"), firstName: "", lastName: "", postId: posts[0]?.id ?? "", contractHours: 35 }] });

  return (
    <>
      <Title title="Votre équipe" text="Ajoutez les personnes à planifier. Disponibilités et postes secondaires se règlent ensuite dans « Équipe »." />

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {posts.map((p) => {
          const team = d.employees.filter((e) => e.postId === p.id).reduce((a, e) => a + e.contractHours, 0);
          const ok = team >= needed[p.id];
          return (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <span className={cx("h-2 w-2 rounded-full", POST_COLORS[p.color].dot)} />
                {p.name}
              </span>
              <span className={cx("tabular-nums", ok ? "text-emerald-700" : "text-amber-700")}>
                {formatHours(team)} / {formatHours(needed[p.id])} nécessaires
              </span>
            </div>
          );
        })}
      </div>

      <Card className="divide-y divide-slate-100">
        {d.employees.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-500">Aucune personne pour l&apos;instant.</p>
            <Button className="mt-3" variant="primary" onClick={() => patch({ employees: exampleTeam(d) })}>
              <Sparkles size={16} /> Remplir avec une équipe d&apos;exemple
            </Button>
            <p className="mt-2 text-xs text-slate-400">Pratique pour essayer : l&apos;équipe est calculée d&apos;après vos besoins.</p>
          </div>
        )}
        {d.employees.map((e) => (
          <div key={e.id} className="grid grid-cols-2 gap-2 px-3 py-2.5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
            <input className={cx(inputClass, "h-10")} placeholder="Prénom" value={e.firstName} onChange={(x) => setEmp(e.id, { firstName: x.target.value })} aria-label="Prénom" />
            <input className={cx(inputClass, "h-10")} placeholder="Nom" value={e.lastName} onChange={(x) => setEmp(e.id, { lastName: x.target.value })} aria-label="Nom" />
            <select className={cx(inputClass, "h-10")} value={e.postId} onChange={(x) => setEmp(e.id, { postId: x.target.value })} aria-label="Poste">
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="flex items-center gap-1.5">
              <Stepper value={e.contractHours} onChange={(v) => setEmp(e.id, { contractHours: v })} min={1} max={48} />
              <span className="text-xs text-slate-500">h/sem.</span>
              <button type="button" aria-label="Retirer" onClick={() => patch({ employees: d.employees.filter((x) => x.id !== e.id) })} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </span>
          </div>
        ))}
      </Card>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={add}>
          <Plus size={16} /> Ajouter une personne
        </Button>
        {d.employees.length > 0 && (
          <Button variant="ghost" onClick={() => patch({ employees: [] })}>
            Tout effacer
          </Button>
        )}
      </div>
    </>
  );
}

// ---- 8. Récapitulatif ------------------------------------------------------------

function StepSummary({ d, goTo }: { d: SetupDraft; goTo: (s: number) => void }) {
  const posts = activePosts(d);
  const total = Object.values(neededHours(d)).reduce((a, b) => a + b, 0);
  const openDays = d.opening.map((x, i) => (x.length ? DAYS_SHORT[i] : null)).filter(Boolean);
  const r = d.rules;
  const org = ORGANISATIONS.find((o) => o.id === d.organisation)!;
  const rows = useMemo(
    () => [
      { step: 0, label: "Établissement", value: `${d.name.trim() || activity(d.activity).label} · ${activity(d.activity).label}` },
      { step: 1, label: "Ouverture", value: `${openDays.join(", ")}${d.prepMinutes ? ` · mise en place ${d.prepMinutes} min` : ""}` },
      {
        step: 2,
        label: "Organisation",
        value: `${org.label} : ${d.services.map((s) => `${s.name} ${formatTime(s.start)}–${formatTime(s.end)}`).join(", ")}`,
      },
      { step: 2, label: "Coupures", value: r.splitShifts === "never" ? "Jamais" : r.splitShifts === "limited" ? `Parfois (${r.maxSplitsPerWeek} max/semaine)` : "Souvent" },
      { step: 3, label: "Postes", value: posts.map((p) => p.name).join(", ") },
      { step: 4, label: "Besoins", value: `${formatHours(total)} de travail par semaine` },
      {
        step: 5,
        label: "Règles",
        value: `${r.restDaysPerWeek} j de repos${r.consecutiveRestDays ? " à la suite" : ""} · ${r.minRestHours} h entre deux journées · ${r.maxHoursPerDay} h max/jour${r.overtimeHours ? ` · +${r.overtimeHours} h possibles` : ""}`,
      },
      { step: 6, label: "Équipe", value: d.employees.length ? `${d.employees.length} personnes · ${d.employees.reduce((a, e) => a + e.contractHours, 0)} h de contrat` : "À ajouter plus tard" },
    ],
    [d, openDays, org, posts, r, total],
  );

  return (
    <>
      <Title title="Tout est prêt" text="Vérifiez vos réponses. En cliquant sur « Créer mon planning », la première semaine est générée automatiquement." />
      <Card className="divide-y divide-slate-100">
        {rows.map((row) => (
          <button key={row.label} type="button" onClick={() => goTo(row.step)} className="flex w-full items-start gap-4 px-4 py-3 text-left hover:bg-slate-50">
            <span className="w-28 shrink-0 text-sm text-slate-500">{row.label}</span>
            <span className="min-w-0 flex-1 text-sm font-medium">{row.value}</span>
            <span className="text-xs font-medium text-brand-600">Modifier</span>
          </button>
        ))}
      </Card>
      {d.employees.length === 0 && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Sans équipe, le planning ne peut pas être généré. Vous pourrez ajouter vos employés juste après.</p>
      )}
      <p className="mt-4 text-xs text-slate-400">Tous ces réglages restent modifiables dans « Réglages ».</p>
    </>
  );
}
