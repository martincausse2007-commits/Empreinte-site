"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { CloudOff } from "@/components/CloudOff";
import { Button, Field, inputClass } from "@/components/ui";
import { authErrorFr, getSupabase } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/supabase/config";

export default function ForgotPage() {
  const sb = getSupabase();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Recevez un lien pour en choisir un nouveau."
      footer={
        <Link href="/connexion" className="font-medium text-brand-700">
          Retour à la connexion
        </Link>
      }
    >
      {!sb ? (
        <CloudOff />
      ) : sent ? (
        <div className="space-y-3 text-sm text-slate-700" role="status">
          <MailCheck className="text-brand-700" />
          <p>
            Si un compte existe pour <b>{email}</b>, un e-mail vient d&apos;être envoyé avec un lien valable une heure.
          </p>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const { error: err } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/nouveau-mot-de-passe` });
            setBusy(false);
            if (err) setError(authErrorFr(err.message));
            else setSent(true);
          }}
        >
          <Field label="Adresse e-mail">
            <input type="email" required className={inputClass} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "Un instant…" : "Envoyer le lien"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
