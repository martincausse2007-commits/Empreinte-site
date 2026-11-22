"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { CloudOff } from "@/components/CloudOff";
import { Button, Field, cx, inputClass } from "@/components/ui";
import { authErrorFr, getSupabase } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/supabase/config";

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const sb = getSupabase();
  const [way, setWay] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("erreur") === "lien" ? "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau." : "");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return;
    setBusy(true);
    setError("");
    const res =
      way === "password"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl()}/auth/callback?next=/etablissements` } });
    setBusy(false);
    if (res.error) return setError(authErrorFr(res.error.message));
    if (way === "magic") setSent(true);
    else router.push("/etablissements");
  }

  return (
    <AuthLayout
      title="Connexion"
      subtitle="Content de vous revoir."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-brand-700">
            Créer un compte
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
            Si un compte existe pour <b>{email}</b>, un lien de connexion vient d&apos;être envoyé. Ouvrez-le sur cet appareil. Pensez à regarder dans les indésirables.
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="Façon de se connecter">
            {(["password", "magic"] as const).map((w) => (
              <button key={w} type="button" aria-pressed={way === w} onClick={() => setWay(w)} className={cx("min-h-11 rounded-lg text-sm font-medium sm:min-h-9", way === w ? "bg-white shadow-sm" : "text-slate-600")}>
                {w === "password" ? "Mot de passe" : "Lien par e-mail"}
              </button>
            ))}
          </div>
          <Field label="Adresse e-mail">
            <input type="email" required className={inputClass} placeholder="vous@restaurant.fr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {way === "password" && (
            <Field label="Mot de passe">
              <input type="password" required className={inputClass} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          )}
          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "Un instant…" : way === "password" ? "Se connecter" : "Recevoir un lien de connexion"}
          </Button>
          <p className="text-center text-sm">
            <Link href="/mot-de-passe-oublie" className="font-medium text-brand-700">
              Mot de passe oublié ?
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
