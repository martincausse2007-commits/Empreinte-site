"use client";

import { useState } from "react";
import { ChevronRight, Trash2, UserPlus } from "lucide-react";
import { uid, useApp } from "@/lib/store";
import type { Employee } from "@/lib/types";
import { hoursByEmployee, isUnavailable } from "@/lib/rules";
import { DAYS, DAYS_SHORT } from "@/lib/time";
import { POST_COLORS } from "@/lib/colors";
import { Avatar, Button, Card, Field, Modal, PageHeader, Stepper, cx, inputClass, useToast } from "@/components/ui";
import { HoursMeter } from "@/components/planning/HoursMeter";

export default function TeamPage() {
  const { state, update } = useApp();
  const toast = useToast();
  const [editing, setEditing] = useState<{ e: Employee; isNew: boolean } | null>(null);
  const hours = hoursByEmployee(state.plans[state.currentWeek] ?? []);
  const post = (id: string) => state.posts.find((p) => p.id === id);

  function save(e: Employee) {
    update((s) => ({
      ...s,
      employees: s.employees.some((x) => x.id === e.id) ? s.employees.map((x) => (x.id === e.id ? e : x)) : [...s.employees, e],
    }));
    setEditing(null);
    toast("Fiche enregistrée");
  }

  function remove(id: string) {
    update((s) => ({
      ...s,
      employees: s.employees.filter((x) => x.id !== id),
      plans: Object.fromEntries(Object.entries(s.plans).map(([w, list]) => [w, list.filter((x) => x.employeeId !== id)])),
    }));
    setEditing(null);
    toast("Employé supprimé");
  }

  const newEmployee = (): Employee => ({
    id: uid("e"),
    firstName: "",
    lastName: "",
    postIds: [state.posts[0]?.id].filter(Boolean),
    contractHours: 35,
    unavailability: [],
    weekendHistory: 0,
  });

  return (
    <div>
      <PageHeader
        title="Équipe"
        subtitle={`${state.employees.length} personnes · ${state.employees.reduce((a, e) => a + e.contractHours, 0)} h de contrat par semaine`}
        actions={
          <Button variant="primary" onClick={() => setEditing({ e: newEmployee(), isNew: true })}>
            <UserPlus size={16} /> Ajouter un employé
          </Button>
        }
      />

      <Card className="divide-y divide-slate-100 overflow-hidden">
        <div className="hidden grid-cols-[1.4fr_1fr_1.2fr_1.3fr_24px] gap-4 bg-slate-50/70 px-5 py-2.5 text-xs font-medium text-slate-500 md:grid">
          <span>Nom</span>
          <span>Postes</span>
          <span>Indisponibilités</span>
          <span>Heures (semaine affichée)</span>
          <span />
        </div>
        {state.employees.map((e) => (
          <button
            key={e.id}
            onClick={() => setEditing({ e, isNew: false })}
            className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 text-left transition hover:bg-slate-50/70 md:grid-cols-[1.4fr_1fr_1.2fr_1.3fr_24px] md:px-5"
          >
            <span className="flex min-w-0 items-center gap-3">
              <Avatar id={e.id} name={`${e.firstName} ${e.lastName}`} size={36} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {e.firstName} {e.lastName}
                </span>
                <span className="block text-xs text-slate-500">{e.contractHours} h / semaine</span>
              </span>
            </span>
            <ChevronRight size={18} className="text-slate-300 md:order-last" />
            <span className="col-span-2 flex flex-wrap gap-1 md:col-span-1">
              {e.postIds.map((id, i) => {
                const p = post(id);
                if (!p) return null;
                return (
                  <span key={id} className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", POST_COLORS[p.color].soft, i > 0 && "opacity-70")}>
                    {p.name}
                  </span>
                );
              })}
            </span>
            <span className="col-span-2 text-xs text-slate-500 md:col-span-1">{summarizeUnavailability(e, state.services) || <span className="text-slate-300">Aucune</span>}</span>
            <span className="col-span-2 md:col-span-1">
              <HoursMeter hours={hours[e.id] ?? 0} contract={e.contractHours} compact />
            </span>
          </button>
        ))}
      </Card>

      {editing && (
        <EmployeeEditor
          key={editing.e.id}
          initial={editing.e}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </div>
  );
}

function summarizeUnavailability(e: Employee, services: { id: string; name: string }[]) {
  return Array.from({ length: 7 }, (_, d) => {
    if (isUnavailable(e, d)) return DAYS_SHORT[d];
    const sv = services.filter((s) => isUnavailable(e, d, s.id));
    return sv.length ? `${DAYS_SHORT[d]} ${sv.map((s) => s.name.toLowerCase()).join("/")}` : null;
  })
    .filter(Boolean)
    .join(", ");
}

function EmployeeEditor({
  initial,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  initial: Employee;
  isNew: boolean;
  onClose: () => void;
  onSave: (e: Employee) => void;
  onDelete: (id: string) => void;
}) {
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

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={isNew ? "Nouvel employé" : `${initial.firstName} ${initial.lastName}`}
      footer={
        <>
          {!isNew && (
            <Button variant="danger" onClick={() => onDelete(e.id)} aria-label="Supprimer">
              <Trash2 size={16} />
              <span className="hidden sm:inline">Supprimer</span>
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid} onClick={() => onSave({ ...e, firstName: e.firstName.trim(), lastName: e.lastName.trim() })}>
            Enregistrer
          </Button>
        </>
      }
    >
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
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium",
                    idx >= 0 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className={cx("h-2 w-2 rounded-full", POST_COLORS[p.color].dot)} />
                  {p.name}
                  {idx === 0 && <span className="text-[10px] font-semibold uppercase opacity-70">principal</span>}
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
                          "h-8 w-full max-w-[92px] rounded-lg text-xs font-medium transition",
                          un ? "bg-slate-800 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
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

        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
          <div>
            <div className="text-sm font-medium">Week-ends travaillés</div>
            <div className="text-xs text-slate-500">sur les 4 dernières semaines — sert à répartir équitablement</div>
          </div>
          <Stepper value={e.weekendHistory} onChange={(v) => set({ weekendHistory: v })} min={0} max={4} />
        </div>
      </div>
    </Modal>
  );
}


