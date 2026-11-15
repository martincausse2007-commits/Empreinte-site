"use client";

import { Plus, RotateCcw, Store, Trash2, UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import { uid, useApp } from "@/lib/store";
import type { BusinessType } from "@/lib/types";
import { COLOR_ORDER, POST_COLORS } from "@/lib/colors";
import { Button, Card, Field, PageHeader, cx, inputClass, useToast } from "@/components/ui";

export default function SettingsPage() {
  const { state, update, reset } = useApp();
  const toast = useToast();
  const router = useRouter();

  const setType = (type: BusinessType) => {
    if (type === state.establishment.type) return;
    if (confirm(`Passer en « ${type === "restaurant" ? "Restaurant" : "Boutique"} » ? La démo sera rechargée avec des données adaptées.`)) {
      reset(type);
      toast("Données de démonstration rechargées");
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Réglages" />

      <Card className="mb-4 p-5">
        <h2 className="mb-4 font-semibold">Établissement</h2>
        <div className="space-y-4">
          <Field label="Nom">
            <input
              className={inputClass}
              value={state.establishment.name}
              onChange={(e) => update((s) => ({ ...s, establishment: { ...s.establishment, name: e.target.value } }))}
            />
          </Field>
          <Field label="Type">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["restaurant", "Restaurant", UtensilsCrossed],
                  ["boutique", "Boutique", Store],
                ] as const
              ).map(([t, label, Icon]) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cx(
                    "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium",
                    state.establishment.type === t ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600",
                  )}
                >
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Card>

      <Card className="mb-4 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Postes</h2>
          <Button
            size="sm"
            onClick={() =>
              update((s) => ({ ...s, posts: [...s.posts, { id: uid("p"), name: "Nouveau poste", color: COLOR_ORDER[s.posts.length % COLOR_ORDER.length] }] }))
            }
          >
            <Plus size={14} /> Ajouter
          </Button>
        </div>
        <div className="space-y-2">
          {state.posts.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="flex gap-1">
                {COLOR_ORDER.slice(0, 8).map((c) => (
                  <button
                    key={c}
                    aria-label={c}
                    onClick={() => update((s) => ({ ...s, posts: s.posts.map((x) => (x.id === p.id ? { ...x, color: c } : x)) }))}
                    className={cx("h-5 w-5 rounded-full", POST_COLORS[c].dot, p.color === c ? "ring-2 ring-slate-900 ring-offset-2" : "opacity-40 hover:opacity-100", "hidden sm:block")}
                  />
                ))}
                <span className={cx("h-5 w-5 rounded-full sm:hidden", POST_COLORS[p.color].dot)} />
              </div>
              <input
                className={inputClass}
                value={p.name}
                onChange={(e) => update((s) => ({ ...s, posts: s.posts.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)) }))}
              />
              <button
                aria-label="Supprimer le poste"
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => update((s) => ({ ...s, posts: s.posts.filter((x) => x.id !== p.id) }))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4 p-5">
        <h2 className="mb-1 font-semibold">Services</h2>
        <p className="mb-4 text-sm text-slate-500">Les grandes plages horaires de la journée.</p>
        <div className="space-y-2">
          {state.services.map((sv) => (
            <div key={sv.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
              <input
                className={inputClass}
                value={sv.name}
                onChange={(e) => update((s) => ({ ...s, services: s.services.map((x) => (x.id === sv.id ? { ...x, name: e.target.value } : x)) }))}
              />
              <input
                type="time"
                className={cx(inputClass, "w-[110px]")}
                value={sv.start}
                onChange={(e) => update((s) => ({ ...s, services: s.services.map((x) => (x.id === sv.id ? { ...x, start: e.target.value } : x)) }))}
              />
              <input
                type="time"
                className={cx(inputClass, "w-[110px]")}
                value={sv.end}
                onChange={(e) => update((s) => ({ ...s, services: s.services.map((x) => (x.id === sv.id ? { ...x, end: e.target.value } : x)) }))}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Démo</h2>
        <p className="mb-4 text-sm text-slate-500">Remet les fausses données de départ (10 employés).</p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              reset(state.establishment.type);
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
