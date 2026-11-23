"use client";

// « Voir comme un salarié » : aperçu simulé dans le navigateur, à partir de la démo.

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { useApp } from "@/lib/store";
import { demoActions, demoSpace } from "@/lib/employee-space";
import { inputClass } from "../ui";
import { Logo } from "../Logo";
import { EmployeeSpaceView } from "./EmployeeView";

export function DemoEmployeeView() {
  const { state, ready, update } = useApp();
  const people = state.employees.filter((e) => !e.archived);
  const [meId, setMe] = useState("");
  const myId = (people.find((e) => e.id === meId) ?? people[0])?.id;
  const space = myId ? demoSpace(state, myId) : null;
  const actions = myId ? demoActions((fn) => update(fn), () => state, myId) : null;
  if (!ready || !space || !actions) return null;

  return (
    <div className="min-h-dvh bg-page">
      <div className="sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2.5">
          <Eye size={16} className="shrink-0 text-brand-200" />
          <span className="min-w-0 flex-1 text-[13px] leading-snug">Aperçu de l&apos;application salarié · simulé dans votre navigateur</span>
          <Link href="/planning" className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[13px] font-medium hover:bg-white/20">
            <ArrowLeft size={14} /> Mon planning
          </Link>
        </div>
      </div>
      <EmployeeSpaceView
        key={myId}
        demo
        space={space}
        actions={actions}
        top={
          <>
            <header className="flex items-center justify-between py-4">
              <Logo />
              <span className="text-xs text-slate-600">{state.establishment.name}</span>
            </header>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Vous êtes</span>
              <select value={myId} onChange={(e) => setMe(e.target.value)} className={inputClass}>
                {people.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                  </option>
                ))}
              </select>
            </label>
          </>
        }
      />
    </div>
  );
}

