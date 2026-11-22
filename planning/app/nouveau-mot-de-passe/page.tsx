"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/AuthLayout";
import { CloudOff } from "@/components/CloudOff";
import { Button, Field, inputClass, useToast } from "@/components/ui";
import { authErrorFr, getSupabase } from "@/lib/supabase/client";

export default function NewPasswordPage() {
  const sb = getSupabase();
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Choisissez un mot de passe d'au moins 8 caractères." footer={null}>
      {!sb ? (
        <CloudOff />
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (password.length < 8) return setError("Mot de passe trop court : 8 caractères minimum.");
            if (password !== confirm) return setError("Les deux mots de passe ne sont pas identiques.");
            setBusy(true);
            const { error: err } = await sb.auth.updateUser({ password });
            setBusy(false);
            if (err) return setError(authErrorFr(err.message));
            toast("Mot de passe modifié");
            router.push("/planning");
          }}
        >
          <Field label="Nouveau mot de passe">
            <input type="password" required minLength={8} className={inputClass} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirmez le mot de passe">
            <input type="password" required minLength={8} className={inputClass} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            Enregistrer
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
