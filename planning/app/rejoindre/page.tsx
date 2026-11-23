"use client";

// Lien d'invitation envoyé par le gérant : le salarié crée son compte (ou se connecte)
// et son compte est relié à sa fiche. Il ne voit ensuite que le planning publié.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { CloudOff } from "@/components/CloudOff";
import { Button, Field, cx, inputClass } from "@/components/ui";
import { authErrorFr, getSupabase } from "@/lib/supabase/client";
import { siteUrl } from "@/lib/supabase/config";
import { useApp } from "@/lib/store";

export default function JoinPage() {
  return (
    <Suspense>
      <Join />
    </Suspense>
  );
}

function Join() {
  const router = useRouter();
  const code = useSearchParams().get("code") ?? "";
  const sb = getSupabase();
  const { mode, userEmail } = useApp();
  const [info, setInfo] = useState<{ establishment: string; first_name: string } | null | undefined>(undefined);
  const [way, setWay] = useState<"new" | "existing">("new");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sb || code.length < 20) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lien incomplet
      setInfo(null);
      return;
    }
    void sb.rpc("invite_info", { p_code: code }).then(({ data }) => setInfo((data as { establishment: string; first_name: string } | null) ?? null));
  }, [sb, code]);

  async function link() {
    if (!sb) return;
    const { error: err } = await sb.rpc("accept_invite", { p_code: code });
    if (err) {
      setError(err.message.includes("déjà relié") ? "Ce compte est déjà relié à un salarié de ce commerce." : "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau à votre responsable.");
      return;
    }
    router.replace("/moi");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return;
    if (password.length < 8) return setError("Mot de passe trop court : 8 caractères minimum.");
    setBusy(true);
    setError("");
    const next = encodeURIComponent(`/rejoindre?code=${code}`);
    const res = way === "new" ? await sb.auth.signUp({ email, password, options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=${next}` } }) : await sb.auth.signInWithPassword({ email, password });
    if (res.error) {
      setBusy(false);
      return setError(authErrorFr(res.error.message));
    }
    if (!res.data.session) {
      setBusy(false);
      return setSent(true); // confirmation de l'adresse e-mail d'abord
    }
    await link();
    setBusy(false);
  }

  const title = info ? `Bonjour ${info.first_name}` : "Rejoindre l'équipe";
  const subtitle = info ? `${info.establishment} vous invite à consulter votre planning sur Quinzo.` : "Votre planning, sur votre téléphone.";

  return (
    <AuthLayout title={title} subtitle={subtitle} footer={<span className="text-slate-600">Gratuit pour les salariés. Votre employeur ne voit pas votre mot de passe.</span>}>
      {!sb ? (
        <CloudOff />
      ) : info === undefined ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : info === null ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Ce lien d&apos;invitation n&apos;est plus valable (il sert une seule fois et dure 14 jours). Demandez-en un nouveau à votre responsable.</p>
      ) : sent ? (
        <div className="space-y-3 text-sm text-slate-700" role="status">
          <MailCheck className="text-brand-700" />
          <p>
            Ouvrez l&apos;e-mail envoyé à <b>{email}</b> et cliquez sur le lien : vous arriverez directement sur votre planning. Pensez aux indésirables.
          </p>
        </div>
      ) : mode === "cloud" && userEmail ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Vous êtes connecté·e avec <b>{userEmail}</b>.
          </p>
          {error && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">{error}</p>}
          <Button variant="primary" size="lg" className="w-full" onClick={() => void link()}>
            Voir mon planning
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-0.5 text-sm" role="group">
            {(["new", "existing"] as const).map((w) => (
              <button key={w} type="button" aria-pressed={way === w} onClick={() => setWay(w)} className={cx("min-h-11 rounded-md font-medium", way === w ? "bg-white shadow-sm" : "text-slate-600")}>
                {w === "new" ? "Créer mon accès" : "J'ai déjà un compte"}
              </button>
            ))}
          </div>
          <Field label="Votre adresse e-mail">
            <input type="email" required className={inputClass} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@exemple.fr" />
          </Field>
          <Field label="Mot de passe" hint={way === "new" ? "8 caractères minimum." : undefined}>
            <input type="password" required minLength={8} className={inputClass} autoComplete={way === "new" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">{error}</p>}
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? "Un instant…" : "Voir mon planning"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
