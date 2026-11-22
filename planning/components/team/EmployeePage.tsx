"use client";

// Fiche employé : une vraie page (/equipe/{id} ou /equipe/nouveau),
// avec « ← Équipe » en haut et le bouton retour du téléphone qui fonctionne.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { uid, useApp } from "@/lib/store";
import { deleteEmployee } from "@/lib/employees";
import { ABSENCE_TYPES, absenceDays } from "@/lib/absences";
import type { AbsenceType } from "@/lib/types";
import { toISODate } from "@/lib/time";
import { CalendarOff } from "lucide-react";
import type { Employee } from "@/lib/types";
import { isUnavailable } from "@/lib/rules";
import { DAYS } from "@/lib/time";
import { POST_COLORS } from "@/lib/colors";
import { useBack } from "@/lib/history";
import { BackButton, Button, Card, Field, Modal, Stepper, cx, inputClass, useToast } from "@/components/ui";

export function EmployeePage({ id }: { id: string }) {
  const { state, ready } = useApp();
  if (!ready) return <div className="h-96 animate-pulse rounded-2xl bg-white" />;
  const existing = state.employees.find((e) => e.id === id);
  if (id !== "nouveau" && !existing) {
    return (
      <div>
        <BackButton fallback="/equipe" label="Équipe" />
        <p className="mt-6 text-slate-600">Cette personne n&apos;existe pas ou a été supprimée.</p>
      </div>
    );
  }
  const initial: Employee = existing ?? {
    id: uid("e"),
    firstName: "",
    lastName: "",
    postIds: [state.posts[0]?.id].filter(Boolean),
    contractHours: 35,
    unavailability: [],
    weekendHistory: 0,
  };
  return <EmployeeForm key={initial.id} initial={initial} isNew={!existing} />;
}

function EmployeeForm({ initial, isNew }: { initial: Employee; isNew: boolean }) {
  const router = useRouter();
  const back = useBack("/equipe");
  const toast = useToast();
  const { update } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { state } = useApp();
  const [e, setE] = useState(initial);
  const set = (patch: Partial<Employee>) => setE((x) => ({ ...x, ...patch }));

  function togglePost(id: string) {
    set({ postIds: e.postIds.includes(id) ? e.postIds.filter((x) => x !== id) : [...e.postIds, id] });
  }

  // Disponibilités : un clic bascule disponible <-> indisponible
  function toggle(day: number, serviceId: string | "all") {
    let un = e.unavailability;
    if (serviceId === "all") {
      un = isUnavailable(e, day) ? un.filter((u) => u.day !== day) : [...un.filter((u) => u.day !== day), { day, serviceId: "all" }];
    } else if (isUnavailable(e, day)) {
      // On passe de "toute la journée" à "tous les services sauf celui-ci"
      un = [...un.filter((u) => u.day !== day), ...state.services.filter((s) => s.id !== serviceId).map((s) => ({ day, serviceId: s.id }))];
    } else if (un.some((u) => u.day === day && u.serviceId === serviceId)) {
      un = un.filter((u) => !(u.day === day && u.serviceId === serviceId));
    } else {
      un = [...un, { day, serviceId }];
      if (state.services.every((s) => un.some((u) => u.day === day && u.serviceId === s.id))) {
        un = [...un.filter((u) => u.day !== day), { day, serviceId: "all" }];
      }
    }
    set({ unavailability: un });
  }

  const valid = e.firstName.trim() && e.postIds.length > 0;


  function save() {
    const clean = { ...e, firstName: e.firstName.trim(), lastName: e.lastName.trim() };
    update((s) => ({
      ...s,
      employees: s.employees.some((x) => x.id === clean.id) ? s.employees.map((x) => (x.id === clean.id ? clean : x)) : [...s.employees, clean],
    }));
    toast(isNew ? `${clean.firstName} a été ajouté·e` : "Fiche enregistrée");
    back();
  }

  function remove() {
    // Historique conservé mais anonymisé (plus de nom, ni taux, ni disponibilités, ni absences)
    update((s) => deleteEmployee(s, e.id), { record: false });
    toast("Salarié supprimé, historique anonymisé");
    router.replace("/equipe");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <BackButton fallback="/equipe" label="Équipe" />
      <h1 className="mt-2 mb-5 text-2xl font-semibold tracking-tight">{isNew ? "Nouvel employé" : `${initial.firstName} ${initial.lastName}`}</h1>
      <Card className="p-5">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom">
            <input className={inputClass} value={e.firstName} onChange={(x) => set({ firstName: x.target.value })} placeholder="Camille" autoFocus={isNew} />
          </Field>
          <Field label="Nom">
            <input className={inputClass} value={e.lastName} onChange={(x) => set({ lastName: x.target.value })} placeholder="Martin" />
          </Field>
        </div>

        <Field label="Postes" hint="Le premier poste sélectionné est le poste principal.">
          <div className="flex flex-wrap gap-1.5">
            {state.posts.map((p) => {
              const idx = e.postIds.indexOf(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePost(p.id)}
                  className={cx(
                    "flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium sm:min-h-9",
                    idx >= 0 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className={cx("h-2 w-2 rounded-full", POST_COLORS[p.color].dot)} />
                  {p.name}
                  {idx === 0 && <span className="text-[10px] font-semibold uppercase">principal</span>}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
          <div>
            <div className="text-sm font-medium">Heures du contrat</div>
            <div className="text-xs text-slate-500">par semaine</div>
          </div>
          <div className="flex items-center gap-2">
            <Stepper value={e.contractHours} onChange={(v) => set({ contractHours: v })} min={1} max={48} />
            <span className="text-sm text-slate-500">h</span>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[13px] font-medium text-slate-700">Disponibilités</div>
          <p className="mb-3 text-xs text-slate-500">Touchez un créneau pour le marquer indisponible (cours, garde d&apos;enfants, autre emploi…).</p>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1fr_repeat(var(--n),minmax(0,1fr))] bg-slate-50 text-xs font-medium text-slate-500" style={{ ["--n" as string]: state.services.length + 1 }}>
              <span className="px-3 py-2">Jour</span>
              {state.services.map((s) => (
                <span key={s.id} className="px-1 py-2 text-center">
                  {s.name}
                </span>
              ))}
              <span className="px-1 py-2 text-center">Journée</span>
            </div>
            {DAYS.map((d, day) => (
              <div key={day} className="grid grid-cols-[1fr_repeat(var(--n),minmax(0,1fr))] border-t border-slate-100" style={{ ["--n" as string]: state.services.length + 1 }}>
                <span className="flex items-center px-3 py-1.5 text-sm">{d}</span>
                {[...state.services.map((s) => s.id), "all"].map((sid) => {
                  const un = sid === "all" ? isUnavailable(e, day) : isUnavailable(e, day, sid);
                  return (
                    <span key={sid} className="flex items-center justify-center p-1">
                      <button
                        type="button"
                        onClick={() => toggle(day, sid)}
                        className={cx(
                          "h-11 w-full max-w-[92px] rounded-lg text-xs font-medium transition sm:h-9",
                          un ? "bg-slate-800 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 ring-inset hover:bg-slate-50",
                        )}
                      >
                        {un ? "Indispo" : "Dispo"}
                      </button>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
          <div>
            <label htmlFor="hourly-rate" className="text-sm font-medium">Taux horaire brut</label>
            <div className="text-xs text-slate-600">Facultatif · sert au coût estimé · visible seulement par vous</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="hourly-rate"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              placeholder="—"
              className={cx(inputClass, "w-28 text-right")}
              value={e.hourlyRate ?? ""}
              onChange={(x) => set({ hourlyRate: x.target.value === "" ? undefined : Math.max(0, Number(x.target.value)) })}
            />
            <span className="text-sm text-slate-600">€/h</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
          <div>
            <div className="text-sm font-medium">Week-ends travaillés</div>
            <div className="text-xs text-slate-500">sur les 4 dernières semaines — sert à répartir équitablement</div>
          </div>
          <Stepper value={e.weekendHistory} onChange={(v) => set({ weekendHistory: v })} min={0} max={4} />
        </div>
      </div>
      </Card>

      {!isNew && <AbsencesCard employeeId={initial.id} firstName={initial.firstName} />}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!isNew && (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={16} /> Supprimer
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="ghost" onClick={back}>
          Annuler
        </Button>
        <Button variant="primary" disabled={!valid} onClick={save}>
          Enregistrer
        </Button>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Supprimer ${initial.firstName} ?`}
        footer={
          <>
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={remove}>
              <Trash2 size={16} /> Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Ses créneaux seront retirés à partir de cette semaine. Les semaines passées restent dans l&apos;historique, mais anonymisées (« Ancien salarié »), sans nom, taux horaire, disponibilités ni absences. Cette action ne peut pas être annulée.
        </p>
      </Modal>
    </div>
  );
}

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
};

/** Congés, repos demandés, arrêts… Type et dates uniquement : jamais de motif. */
function AbsencesCard({ employeeId, firstName }: { employeeId: string; firstName: string }) {
  const { state, update } = useApp();
  const toast = useToast();
  const today = toISODate(new Date());
  const [type, setType] = useState<AbsenceType>("cp");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const list = (state.absences ?? []).filter((a) => a.employeeId === employeeId).sort((a, b) => a.start.localeCompare(b.start));
  const valid = start && end && end >= start;

  return (
    <Card className="mt-4 p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <CalendarOff size={18} className="text-brand-700" /> Absences
      </h2>
      <p className="mt-1 mb-4 text-sm text-slate-600">
        Congés, repos demandés, arrêts, formations. Elles bloquent la génération du planning. N&apos;indiquez jamais de motif ni d&apos;information médicale.
      </p>
      {list.length > 0 && (
        <ul className="mb-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {list.map((a) => (
            <li key={a.id} className="flex min-h-11 items-center gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <b className="font-semibold">{ABSENCE_TYPES[a.type].label}</b> · {a.start === a.end ? fmtDate(a.start) : `du ${fmtDate(a.start)} au ${fmtDate(a.end)}`}
                <span className="text-slate-600"> ({absenceDays(a)} j)</span>
              </span>
              <button
                type="button"
                aria-label="Supprimer cette absence"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 sm:h-9 sm:w-9"
                onClick={() => {
                  update((s) => ({ ...s, absences: s.absences.filter((x) => x.id !== a.id) }));
                  toast("Absence supprimée");
                }}
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <Field label="Type">
          <select className={inputClass} value={type} onChange={(x) => setType(x.target.value as AbsenceType)}>
            {(Object.keys(ABSENCE_TYPES) as AbsenceType[]).map((t) => (
              <option key={t} value={t}>
                {ABSENCE_TYPES[t].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Du">
          <input type="date" className={inputClass} value={start} onChange={(x) => (setStart(x.target.value), x.target.value > end && setEnd(x.target.value))} />
        </Field>
        <Field label="Au (inclus)">
          <input type="date" className={inputClass} value={end} min={start} onChange={(x) => setEnd(x.target.value)} />
        </Field>
        <Button
          variant="primary"
          disabled={!valid}
          onClick={() => {
            update((s) => ({ ...s, absences: [...(s.absences ?? []), { id: uid("a"), employeeId, type, start, end }] }));
            toast(`${ABSENCE_TYPES[type].label} ajouté pour ${firstName}`);
          }}
        >
          Ajouter
        </Button>
      </div>
    </Card>
  );
}
