"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, UtensilsCrossed } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button, Field, cx, inputClass } from "@/components/ui";
import { useApp } from "@/lib/store";
import type { BusinessType } from "@/lib/types";

export default function SignupPage() {
  const router = useRouter();
  const { reset } = useApp();
  const [type, setType] = useState<BusinessType>("restaurant");
  const [name, setName] = useState("");

  return (
    <AuthLayout
      title="Créer votre établissement"
      subtitle="Gratuit pendant la bêta. Aucune carte bancaire."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href="/connexion" className="font-medium text-brand-600">
            Se connecter
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          reset(type, name.trim());
          router.push("/planning");
        }}
      >
        <Field label="Type d'établissement">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["restaurant", "Restaurant", "Salle, cuisine, bar", UtensilsCrossed],
                ["boutique", "Boutique", "Vente, caisse, réserve", Store],
              ] as const
            ).map(([t, label, sub, Icon]) => (
              <button
                type="button"
                key={t}
                onClick={() => setType(t)}
                className={cx(
                  "rounded-xl border p-3 text-left transition",
                  type === t ? "border-brand-500 bg-brand-50 ring-4 ring-brand-500/10" : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <Icon size={20} className={type === t ? "text-brand-600" : "text-slate-500"} />
                <div className="mt-2 text-sm font-semibold">{label}</div>
                <div className="text-xs text-slate-500">{sub}</div>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Nom de l'établissement">
          <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "restaurant" ? "Le Comptoir des Halles" : "Maison Lumen"} />
        </Field>
        <Field label="Adresse e-mail">
          <input type="email" required className={inputClass} placeholder="vous@exemple.fr" autoComplete="email" />
        </Field>
        <Field label="Mot de passe" hint="8 caractères minimum.">
          <input type="password" required minLength={8} className={inputClass} autoComplete="new-password" />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full">
          Créer mon compte
        </Button>
      </form>
    </AuthLayout>
  );
}
