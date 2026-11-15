"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutTemplate, Settings, Share2, SlidersHorizontal, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "../Logo";
import { cx } from "../ui";
import { useApp } from "@/lib/store";
import { activity } from "@/lib/presets";

const NAV = [
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/equipe", label: "Équipe", icon: Users },
  { href: "/besoins", label: "Besoins", icon: SlidersHorizontal },
  { href: "/modeles", label: "Modèles", icon: LayoutTemplate },
  { href: "/partage", label: "Partage", icon: Share2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { state, ready } = useApp();
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="min-h-dvh md:pl-60">
      {/* Barre latérale (ordinateur) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200/80 bg-white md:flex">
        <div className="px-5 pt-5 pb-4">
          <Logo />
        </div>
        <div className="mx-3 mb-3 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5">
          <div className="truncate text-sm font-medium">{ready ? state.establishment.name : "…"}</div>
          <div className="text-xs text-slate-500">{activity(state.establishment.type).label} · {state.employees.length} personnes</div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive(href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon size={18} strokeWidth={isActive(href) ? 2.2 : 1.8} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <Link
            href="/reglages"
            className={cx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              isActive("/reglages") ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            <Settings size={18} strokeWidth={1.8} />
            Réglages
          </Link>
        </div>
      </aside>

      {/* En-tête (mobile) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur md:hidden">
        <Logo />
        <Link href="/reglages" aria-label="Réglages" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <Settings size={20} />
        </Link>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 pt-5 pb-28 sm:px-6 md:pt-8 md:pb-12 lg:px-8">{children}</main>

      {/* Barre d'onglets (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", isActive(href) ? "text-brand-600" : "text-slate-500")}
          >
            <Icon size={21} strokeWidth={isActive(href) ? 2.2 : 1.8} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
