"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { Button, Field, inputClass } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  return (
    <AuthLayout
      title="Connexion"
      subtitle="Content de vous revoir."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-brand-600">
            Créer un compte
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          router.push("/planning");
        }}
      >
        <Field label="Adresse e-mail">
          <input type="email" required className={inputClass} placeholder="vous@restaurant.fr" defaultValue="gerant@demo.fr" autoComplete="email" />
        </Field>
        <Field label="Mot de passe">
          <input type="password" required className={inputClass} defaultValue="demo1234" autoComplete="current-password" />
        </Field>
        <Button type="submit" variant="primary" size="lg" className="w-full">
          Se connecter
        </Button>
        <p className="text-center text-xs text-slate-500">Maquette : n&apos;importe quel e-mail fonctionne.</p>
      </form>
    </AuthLayout>
  );
}
