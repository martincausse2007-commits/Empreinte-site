"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { CloudOff } from "@/components/CloudOff";
import { Button, Field, inputClass } from "@/components/ui";
import { authErrorFr, getSupabase } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/supabase/config";
import { IMPORT_FLAG, localDemoData } from "@/lib/store";

export default function SignupPage() {
  const router = useRouter();
  const sb = getSupabase();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepDemo, setKeepDemo] = useState(false);
  const [hasDemo, setHasDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // Des données de démo existent sur cet appareil ? On propose de les garder.
    const demo = localDemoData();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture du stockage local au chargement
    setHasDemo(!!demo);
    setKeepDemo(!!demo && new URLSearchParams(location.search).get("depuis") === "demo");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return;
    if (password.length < 8) return setError("Mot de passe trop court : 8 caractères minimum.");
    setBusy(true);
    setError("");
    try {
      if (keepDemo) localStorage.setItem(IMPORT_FLAG, "1");
      else localStorage.removeItem(IMPORT_FLAG);
    } catch {
      /* ignore */
    }
    const next = keepDemo ? "/planning" : "/configuration";
    const { data, error: err } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=${next}` } });
    setBusy(false);
    if (err) return setError(authErrorFr(err.message));
    if (data.session) router.push(next); // confirmation par e-mail désactivée
    else setSent(true);
  }

  return (
    <AuthLayout
      title="Créer votre compte"
      subtitle="Gratuit pendant la bêta. Aucune carte bancaire."
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href="/connexion" className="font-medium text-brand-700">
            Se connecter
          </Link>
        </>
      }
    >
      {!sb ? (
        <CloudOff />
      ) : sent ? (
        <div className="space-y-3 text-sm text-slate-700" role="status">
          <MailCheck className="text-brand-700" />
          <p>
            Dernière étape : ouvrez l&apos;e-mail envoyé à <b>{email}</b> et cliquez sur le lien pour confirmer votre adresse. Pensez à regarder dans les indésirables.
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Adresse e-mail">
            <input type="email" required className={inputClass} placeholder="vous@exemple.fr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Mot de passe" hint="8 caractères minimum.">
            <input type="password" required minLength={8} className={inputClass} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {hasDemo && (
            <label className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--color-brand-600)]" checked={keepDemo} onChange={(e) => setKeepDemo(e.target.checked)} />
              <span>
                <b>Garder les données de la démo</b>
                <span className="block text-slate-600">Équipe, réglages et plannings saisis sur cet appareil seront repris dans votre compte.</span>
              </span>
            </label>
          )}
          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "Un instant…" : "Créer mon compte"}
          </Button>
          {!keepDemo && <p className="text-center text-xs text-slate-600">Ensuite, quelques questions (5 à 10 minutes) pour adapter le planning à votre établissement.</p>}
        </form>
      )}
    </AuthLayout>
  );
}
