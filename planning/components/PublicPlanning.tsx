"use client";

import { useEffect, useMemo, useState } from "react";
import type { Post, Shift } from "@/lib/types";
import { getSupabase } from "@/lib/supabase/client";
import { isCloudConfigured } from "@/lib/supabase/config";

type View = {
  name: string;
  employees: { id: string; firstName: string; lastName?: string; contractHours?: number }[];
  posts: Post[];
  weeks: Record<string, { publishedAt?: string; snapshot: Shift[] }>;
};

/** Données affichées : la démo du navigateur, ou la base (semaines publiées seulement) pour un vrai lien. */
function usePublicView(token: string): View | null | undefined {
  const { state, ready } = useApp();
  const cloud = isCloudConfigured && token !== "demo";
  const [remote, setRemote] = useState<View | null | undefined>(undefined);
  useEffect(() => {
    if (!cloud) return;
    void getSupabase()
      ?.rpc("get_public_planning", { p_token: token })
      .then(({ data }) => {
        if (!data) return setRemote(null);
        const d = data as { establishment: string; posts: Post[]; employees: { id: string; first_name: string }[]; weeks: { week: string; published_at?: string; snapshot?: Shift[] }[] };
        setRemote({
          name: d.establishment,
          posts: d.posts,
          employees: d.employees.map((e) => ({ id: e.id, firstName: e.first_name })),
          weeks: Object.fromEntries(d.weeks.map((x) => [String(x.week).slice(0, 10), { publishedAt: x.published_at, snapshot: x.snapshot ?? [] }])),
        });
      });
  }, [cloud, token]);
  if (cloud) return remote;
  if (!ready) return undefined;
  const weeks: View["weeks"] = {};
  for (const [w, m] of Object.entries(state.weekMeta ?? {})) if (m.status === "published" && m.snapshot) weeks[w] = { publishedAt: m.publishedAt, snapshot: m.snapshot };
  return { name: state.establishment.name, posts: state.posts, employees: state.employees.filter((e) => !e.archived), weeks };
}
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useApp } from "@/lib/store";
import { hoursByEmployee } from "@/lib/rules";
import { DAYS, addWeeks, formatDayDate, formatHours, formatTime, formatWeekRange, mondayOf } from "@/lib/time";
import { POST_COLORS } from "@/lib/colors";
import { Avatar, cx } from "./ui";
import { Logo } from "./Logo";

/** Page publique en lecture seule, pensée pour le téléphone des employés. */
export function PublicPlanning({ token }: { token: string }) {
  const view = usePublicView(token);
  const [week, setWeek] = useState<string | null>(null);
  const [me, setMe] = useState<string>("");
  // Semaine affichée : celle demandée, sinon la semaine en cours si publiée, sinon la plus proche publiée
  const thisMonday = mondayOf(new Date());
  const published = Object.keys(view?.weeks ?? {}).sort();
  const w = week ?? (published.includes(thisMonday) ? thisMonday : (published.find((x) => x > thisMonday) ?? published[published.length - 1] ?? thisMonday));
  // L'équipe ne voit que la version publiée (jamais le brouillon en cours)
  const meta = view?.weeks[w];
  const shifts = useMemo(() => meta?.snapshot ?? [], [meta]);
  const hours = hoursByEmployee(shifts);
  const emp = (id: string) => view?.employees.find((e) => e.id === id);
  const post = (id: string) => view?.posts.find((p) => p.id === id);

  if (view === undefined) return null;
  if (view === null)
    return (
      <div className="mx-auto min-h-dvh max-w-xl px-4 py-12 text-center">
        <Logo />
        <p className="mt-6 rounded-xl bg-white p-6 text-sm text-slate-600">Ce lien n&apos;est plus valable. Demandez le nouveau lien à votre responsable.</p>
      </div>
    );

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 pb-12">
      <header className="flex items-center justify-between py-4">
        <Logo />
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
          <Eye size={12} /> Lecture seule
        </span>
      </header>

      <h1 className="text-xl font-semibold">{view.name}</h1>
      <div className="mt-3 mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white">
        <button className="flex h-12 w-12 items-center justify-center text-slate-600" onClick={() => setWeek(addWeeks(w, -1))} aria-label="Semaine précédente">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold">{formatWeekRange(w)}</span>
        <button className="flex h-12 w-12 items-center justify-center text-slate-600" onClick={() => setWeek(addWeeks(w, 1))} aria-label="Semaine suivante">
          <ChevronRight size={18} />
        </button>
      </div>

      <select value={me} onChange={(e) => setMe(e.target.value)} className="mb-5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px]">
        <option value="">Toute l&apos;équipe</option>
        {view.employees.map((e) => (
          <option key={e.id} value={e.id}>
            Je suis {e.firstName} {e.lastName ?? ""}
          </option>
        ))}
      </select>

      {me && (
        <div className="mb-5 rounded-2xl bg-brand-600 p-4 text-white">
          <div className="text-sm">Mes heures cette semaine</div>
          <div className="text-2xl font-semibold">
            {formatHours(hours[me] ?? 0)} {emp(me)?.contractHours !== undefined && <span className="text-base font-normal">/ {emp(me)?.contractHours} h</span>}
          </div>
        </div>
      )}

      {shifts.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">Le planning de cette semaine n&apos;est pas encore publié.</p>}
      {shifts.length > 0 && meta?.publishedAt && (
        <p className="mb-3 text-xs text-slate-500">Publié le {new Date(meta.publishedAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}.</p>
      )}

      <div className="space-y-3">
        {shifts.length > 0 &&
          DAYS.map((d, day) => {
            const list = shifts
              .filter((s) => s.day === day && (!me || s.employeeId === me))
              .sort((a, b) => a.start.localeCompare(b.start) || a.postId.localeCompare(b.postId));
            return (
              <div key={day} className="rounded-2xl border border-slate-200/80 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <span className="font-semibold">{d}</span>
                  <span className="text-xs text-slate-500">{formatDayDate(w, day)}</span>
                </div>
                {list.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500">{me ? "Repos" : "Fermé"}</div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {list.map((s) => {
                      const e = emp(s.employeeId);
                      const p = post(s.postId);
                      if (!e) return null;
                      return (
                        <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                          <Avatar id={e.id} name={`${e.firstName} ${e.lastName ?? ""}`} size={30} />
                          <span className="flex-1 text-sm font-medium">{e.firstName}</span>
                          {p && (
                            <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", POST_COLORS[p.color].soft)}>{p.name}</span>
                          )}
                          <span className="w-24 text-right text-sm tabular-nums">
                            {formatTime(s.start)} – {formatTime(s.end)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
