"use client";

import { useState } from "react";
import { nav, site } from "@/lib/site";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-stone-50/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:px-10">
        <a href="#" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full bg-stone-900 font-display text-sm text-amber-200"
          >
            E
          </span>
          <span className="font-display text-xl tracking-tight text-stone-900">{site.name}</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navigation principale">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-stone-600 transition-colors hover:text-stone-900"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#contact"
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition-colors hover:bg-amber-800"
          >
            Demander un devis
          </a>
        </nav>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full text-stone-700 hover:bg-stone-200/70 md:hidden"
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            {open ? (
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            ) : (
              <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav
          id="menu-mobile"
          className="border-t border-stone-200 bg-stone-50 px-6 pb-6 pt-2 md:hidden"
          aria-label="Navigation mobile"
        >
          {[...nav, { href: "#contact", label: "Demander un devis" }].map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block border-b border-stone-200/70 py-3 text-stone-700 last:border-0"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
