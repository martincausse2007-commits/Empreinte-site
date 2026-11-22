"use client";

// Choix de l'établissement ouvert (un gérant peut en avoir plusieurs).

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, LayoutGrid, Plus } from "lucide-react";
import { useApp } from "@/lib/store";
import { activity } from "@/lib/presets";
import { useHistoryLayer } from "@/lib/history";
import { cx } from "../ui";
import { ActivityIcon } from "./ActivityIcon";

export function EstablishmentSwitcher({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { state, establishments, activeId, switchTo, ready } = useApp();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  useHistoryLayer(open, () => setOpen(false));
  const dark = tone === "dark";

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
          dark ? "bg-white/8 text-white hover:bg-white/12" : "text-ink hover:bg-slate-100",
        )}
      >
        <ActivityIcon type={state.establishment.type} className={dark ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{ready ? state.establishment.name : "…"}</span>
          <span className={cx("block truncate text-xs", dark ? "text-white/70" : "text-slate-600")}>
            {activity(state.establishment.type).label} · {establishments.length} établissement{establishments.length > 1 ? "s" : ""}
          </span>
        </span>
        <ChevronsUpDown size={16} className={dark ? "text-white/70" : "text-slate-500"} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="menu" className="animate-pop absolute top-full right-0 left-0 z-50 mt-2 min-w-64 rounded-xl border border-slate-200 bg-white p-1.5 text-ink shadow-xl">
            <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wide text-slate-600 uppercase">Mes établissements</div>
            {establishments.map((e) => (
              <button
                key={e.id}
                role="menuitem"
                onClick={async () => {
                  setOpen(false);
                  await switchTo(e.id);
                  router.push("/planning");
                }}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-slate-50"
              >
                <ActivityIcon type={e.type} className="bg-slate-100 text-slate-700" small />
                <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
                {e.id === activeId && <Check size={16} className="text-brand-700" aria-label="ouvert" />}
              </button>
            ))}
            <div className="my-1 h-px bg-slate-100" />
            <Link href="/etablissements" role="menuitem" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm text-slate-700 hover:bg-slate-50">
              <LayoutGrid size={16} /> Vue d&apos;ensemble
            </Link>
            <Link href="/configuration?nouveau=1" role="menuitem" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50">
              <Plus size={16} /> Ajouter un établissement
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
