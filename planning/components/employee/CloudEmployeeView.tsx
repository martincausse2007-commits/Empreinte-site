"use client";

// L'application du salarié connecté (/moi) : ses plannings publiés, ses demandes.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useApp } from "@/lib/store";
import { cloudActions, loadMySpaces, type Space } from "@/lib/employee-space";
import { buttonClass, Card, inputClass } from "../ui";
import { Logo } from "../Logo";
import { EmployeeSpaceView } from "./EmployeeView";

export function CloudEmployeeView() {
  const { mode, ready, signOut, establishments } = useApp();
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [error, setError] = useState(false);
  const [active, setActive] = useState<string>("");

  const reload = useCallback(async () => {
    try {
      setSpaces(await loadMySpaces());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (mode !== "cloud") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial
    void reload();
    // L'appli reste ouverte sur le téléphone : on relit quand on y revient
    const onVisible = () => document.visibilityState === "visible" && void reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [mode, reload]);

  // Enregistre le service worker (notifications) dès l'ouverture de l'appli
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => undefined);
  }, []);

  const space = spaces?.find((s) => s.id === active) ?? spaces?.[0];
  const actions = useMemo(() => (space ? cloudActions(space, reload) : null), [space, reload]);

  if (!ready || mode === "loading") return null;

  const shell = (children: React.ReactNode) => (
    <div className="min-h-dvh bg-page">
      <div className="mx-auto max-w-xl px-4 pt-4 pb-10">
        <header className="mb-4 flex items-center justify-between">
          <Logo />
          {mode === "cloud" && (
            <button onClick={() => void signOut()} className="flex min-h-11 items-center gap-1.5 text-sm text-slate-600">
              <LogOut size={15} /> Déconnexion
            </button>
          )}
        </header>
        {children}
      </div>
    </div>
  );

  if (mode === "demo")
    return shell(
      <Card className="space-y-3 p-5 text-sm text-slate-700">
        <p>Cet espace est celui des salariés, une fois leur compte relié à votre planning.</p>
        <Link href="/salarie" className={buttonClass("primary", "md", "w-full")}>
          Voir l&apos;aperçu salarié de la démo
        </Link>
        <Link href="/connexion" className={buttonClass("secondary", "md", "w-full")}>
          Se connecter
        </Link>
      </Card>,
    );

  if (error) return shell(<Card className="p-5 text-sm text-slate-700">Connexion impossible pour le moment. Vérifiez votre réseau et rouvrez l&apos;application.</Card>);
  if (!spaces) return shell(<div className="h-64 animate-pulse rounded-2xl bg-white" />);
  if (!space || !actions)
    return shell(
      <Card className="space-y-3 p-5 text-sm text-slate-700">
        <p className="font-semibold">Votre compte n&apos;est relié à aucun planning.</p>
        <p>Demandez à votre responsable le lien d&apos;invitation (fiche salarié → « Inviter sur l&apos;application ») et ouvrez-le sur ce téléphone.</p>
        {establishments.length > 0 && (
          <Link href="/planning" className={buttonClass("secondary", "md", "w-full")}>
            Aller à mon espace gérant
          </Link>
        )}
      </Card>,
    );

  return (
    <div className="min-h-dvh bg-page">
      <EmployeeSpaceView
        key={space.id + space.me.id}
        space={space}
        actions={actions}
        top={
          <>
            <header className="flex items-center justify-between py-4">
              <Logo />
              <button onClick={() => void signOut()} className="flex min-h-11 items-center gap-1.5 text-sm text-slate-600">
                <LogOut size={15} /> Déconnexion
              </button>
            </header>
            <div className="mb-4">
              <div className="text-xl font-semibold">Bonjour {space.me.firstName}</div>
              {spaces.length > 1 ? (
                <select value={space.id} onChange={(e) => setActive(e.target.value)} className={inputClass + " mt-2"} aria-label="Établissement">
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-slate-600">{space.name}</div>
              )}
              {establishments.length > 0 && (
                <Link href="/planning" className="mt-1 inline-block text-sm font-medium text-brand-700">
                  Mon espace gérant →
                </Link>
              )}
            </div>
          </>
        }
      />
    </div>
  );
}
