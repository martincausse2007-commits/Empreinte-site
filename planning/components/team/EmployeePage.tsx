"use client";

// Fiche employé : une vraie page (/equipe/{id} ou /equipe/nouveau),
// avec « ← Équipe » en haut et le bouton retour du téléphone qui fonctionne.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { uid, useApp } from "@/lib/store";
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
    update((s) => ({
      ...s,
      employees: s.employees.filter((x) => x.id !== e.id),
      plans: Object.fromEntries(Object.entries(s.plans).map(([w, list]) => [w, list.filter((x) => x.employeeId !== e.id)])),
    }));
    toast("Employé supprimé");
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

        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
          <div>
            <div className="text-sm font-medium">Week-ends travaillés</div>
            <div className="text-xs text-slate-500">sur les 4 dernières semaines — sert à répartir équitablement</div>
          </div>
          <Stepper value={e.weekendHistory} onChange={(v) => set({ weekendHistory: v })} min={0} max={4} />
        </div>
      </div>
      </Card>

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
        <p className="text-sm text-slate-600">Ses créneaux seront retirés de tous les plannings. Cette action ne peut pas être annulée.</p>
      </Modal>
    </div>
  );
}
