"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CalendarDays, Check, CloudOff, Clock, LayoutTemplate, Loader2, Settings, Share2, SlidersHorizontal, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "../Logo";
import { cx } from "../ui";
import { useApp } from "@/lib/store";
import { EstablishmentSwitcher } from "./EstablishmentSwitcher";

const NAV = [
  { href: "/planning", label: "Planning", icon: CalendarDays, mobile: true },
  { href: "/equipe", label: "Équipe", icon: Users, mobile: true },
  { href: "/heures", label: "Heures", icon: Clock, mobile: true },
  { href: "/besoins", label: "Besoins", icon: SlidersHorizontal, mobile: false },
  { href: "/modeles", label: "Modèles", icon: LayoutTemplate, mobile: true },
  { href: "/partage", label: "Partage", icon: Share2, mobile: true },
];
// Sur téléphone, 5 onglets maximum : « Besoins » est accessible depuis Réglages.

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { mode, needsSetup, saveStatus } = useApp();
  const router = useRouter();
  // Compte tout neuf : direction le questionnaire
  useEffect(() => {
    if (mode === "cloud" && needsSetup) router.replace("/configuration");
  }, [mode, needsSetup, router]);
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="min-h-dvh md:pl-64">
      {/* Barre latérale (ordinateur) : couleur encre, pour une identité marquée */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink text-white md:flex">
        <Link href="/etablissements" className="px-5 pt-5 pb-4" aria-label="Quinzo, mes établissements">
          <Logo tone="dark" />
        </Link>
        <div className="mx-3 mb-4">
          <EstablishmentSwitcher tone="dark" />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Navigation principale">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cx(
                "relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
                isActive(href) ? "bg-white/12 text-white" : "text-white/75 hover:bg-white/8 hover:text-white",
              )}
            >
              {isActive(href) && <span className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-brand-400" aria-hidden />}
              <Icon size={18} strokeWidth={isActive(href) ? 2.2 : 1.8} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Link
            href="/reglages"
            aria-current={isActive("/reglages") ? "page" : undefined}
            className={cx("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition", isActive("/reglages") ? "bg-white/12 text-white" : "text-white/75 hover:bg-white/8 hover:text-white")}
          >
            <Settings size={18} strokeWidth={1.8} />
            Réglages
          </Link>
        </div>
      </aside>

      {/* En-tête (mobile) : l'établissement ouvert, qu'on peut changer d'un tap */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur md:hidden">
        <div className="min-w-0 flex-1">
          <EstablishmentSwitcher tone="light" />
        </div>
        <Link href="/reglages" aria-label="Réglages" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
          <Settings size={20} />
        </Link>
      </header>

      {mode === "demo" && (
        <div className="border-b border-brand-100 bg-brand-50 px-4 py-2.5 text-sm text-brand-900 sm:px-6 lg:px-8" role="note">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2">
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">Démo</span>
            <span className="flex-1">Vos données restent sur cet appareil.</span>
            <Link href="/inscription?depuis=demo" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2 sm:min-h-0">
              Créer un compte et garder ces données
            </Link>
          </div>
        </div>
      )}
      {mode === "cloud" && (
        <div className="pointer-events-none fixed top-3 right-4 z-40 hidden md:block" aria-live="polite">
          <span className={cx("inline-flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-xs font-medium shadow-xs", saveStatus === "error" ? "border-red-300 text-red-800" : "border-slate-200 text-slate-600")}>
            {saveStatus === "saving" ? <Loader2 size={12} className="animate-spin" /> : saveStatus === "error" ? <CloudOff size={12} /> : <Check size={12} />}
            {saveStatus === "saving" ? "Enregistrement…" : saveStatus === "error" ? "Non enregistré, nouvel essai à la prochaine modification" : "Enregistré"}
          </span>
        </div>
      )}
      {mode === "cloud" && saveStatus === "error" && (
        <div className="border-b border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-900 md:hidden" role="alert">
          Problème de connexion : vos dernières modifications ne sont pas encore enregistrées.
        </div>
      )}

      <main className="mx-auto max-w-[1400px] px-4 pt-5 pb-28 sm:px-6 md:pt-8 md:pb-12 lg:px-8">{children}</main>

      {/* Barre d'onglets (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.filter((n) => n.mobile).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cx("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", isActive(href) ? "text-brand-700" : "text-slate-600")}
          >
            <Icon size={21} strokeWidth={isActive(href) ? 2.2 : 1.8} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
