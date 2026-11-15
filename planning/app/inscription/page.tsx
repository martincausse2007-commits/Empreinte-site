"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { Button, Field, inputClass } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  return (
    <AuthLayout
      title="Créer votre compte"
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
          router.push("/configuration");
        }}
      >
        <Field label="Adresse e-mail">
          <input type="email" required className={inputClass} placeholder="vous@exemple.fr" autoComplete="email" />
        </Field>
        <Field label="Mot de passe" hint="8 caractères minimum.">
          <input type="password" required minLength={8} className={inputClass} autoComplete="new-password" />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full">
          Continuer
        </Button>
        <p className="text-center text-xs text-slate-500">Ensuite, quelques questions (5 à 10 minutes) pour adapter le planning à votre établissement.</p>
      </form>
    </AuthLayout>
  );
}
