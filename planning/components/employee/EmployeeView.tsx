"use client";

// « Voir comme un salarié » : l'écran que verra l'équipe (phase 2), simulé
// dans le navigateur. Les demandes créées ici arrivent dans le planning du gérant.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, CalendarOff, CalendarRange, Check, ChevronLeft, ChevronRight, Clock, Eye, Send } from "lucide-react";
import { useApp } from "@/lib/store";
import type { AbsenceType, EmployeePrefs, Shift, TeamRequest, Unavailability } from "@/lib/types";
import { hoursByEmployee } from "@/lib/rules";
import { DAYS, addWeeks, formatDayDate, formatHours, formatTime, formatWeekRange, toISODate } from "@/lib/time";
import { ABSENCE_TYPES } from "@/lib/absences";
import { newRequest, requestSummary, swapProblems } from "@/lib/requests";
import { POST_COLORS } from "@/lib/colors";
import { Avatar, Button, Card, Field, Modal, cx, inputClass, useToast } from "../ui";
import { Logo } from "../Logo";
import { PrefsEditor } from "../team/PrefsEditor";

export function EmployeeView() {
  const { state, ready, update } = useApp();
  const toast = useToast();
  const people = state.employees.filter((e) => !e.archived);
  const [meId, setMe] = useState<string>("");
  const me = people.find((e) => e.id === meId) ?? people[0];
  const [week, setWeek] = useState<string | null>(null);
  const [tab, setTab] = useState<"planning" | "demandes">("planning");
  const [swapOf, setSwapOf] = useState<Shift | null>(null);
  // Par défaut : la semaine affichée si elle est publiée, sinon la dernière publiée
  const lastPublished = Object.entries(state.weekMeta ?? {})
    .filter(([, m]) => m.status === "published")
    .map(([k]) => k)
    .sort()
    .pop();
  const w = week ?? (state.weekMeta?.[state.currentWeek]?.status === "published" ? state.currentWeek : (lastPublished ?? state.currentWeek));
  const meta = state.weekMeta?.[w];
  const published = useMemo(() => (meta?.status === "published" ? (meta.snapshot ?? []) : []), [meta]);

  if (!ready || !me) return null;
  const mine = published.filter((s) => s.employeeId === me.id);
  const hours = hoursByEmployee(published)[me.id] ?? 0;
  const myRequests = (state.requests ?? []).filter((r) => r.employeeId === me.id);
  const post = (id: string) => state.posts.find((p) => p.id === id);

  function send(r: Omit<TeamRequest, "id" | "status" | "createdAt">, msg: string) {
    update((s) => ({ ...s, requests: [...(s.requests ?? []), newRequest(r)] }));
    toast(msg);
  }

  return (
    <div className="min-h-dvh bg-page">
      <div className="sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2.5">
          <Eye size={16} className="shrink-0 text-brand-200" />
          <span className="min-w-0 flex-1 text-[13px] leading-snug">Aperçu de l&apos;écran salarié · simulé dans votre navigateur</span>
          <Link href="/planning" className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-[13px] font-medium hover:bg-white/20">
            <ArrowLeft size={14} /> Mon planning
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pb-16">
        <header className="flex items-center justify-between py-4">
          <Logo />
          <span className="text-xs text-slate-600">{state.establishment.name}</span>
        </header>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-slate-700">Vous êtes</span>
          <select value={me.id} onChange={(e) => setMe(e.target.value)} className={inputClass}>
            {people.map((e) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
              </option>
            ))}
          </select>
        </label>

        <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-200/60 p-1">
          {(["planning", "demandes"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={cx("min-h-11 rounded-lg text-sm font-medium", tab === t ? "bg-white shadow-sm" : "text-slate-600")}>
              {t === "planning" ? "Mon planning" : `Mes demandes${myRequests.some((r) => r.status === "pending") ? ` (${myRequests.filter((r) => r.status === "pending").length})` : ""}`}
            </button>
          ))}
        </div>

        {tab === "planning" ? (
          <>
            <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white">
              <button className="flex h-12 w-12 items-center justify-center text-slate-600" onClick={() => setWeek(addWeeks(w, -1))} aria-label="Semaine précédente">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold">{formatWeekRange(w)}</span>
              <button className="flex h-12 w-12 items-center justify-center text-slate-600" onClick={() => setWeek(addWeeks(w, 1))} aria-label="Semaine suivante">
                <ChevronRight size={18} />
              </button>
            </div>

            {published.length === 0 ? (
              <Card className="p-6 text-center text-sm text-slate-600">
                Le planning de cette semaine n&apos;est pas encore publié. Vous serez prévenu·e dès qu&apos;il le sera.
              </Card>
            ) : (
              <>
                <div className="mb-4 rounded-2xl bg-brand-600 p-4 text-white">
                  <div className="text-sm">Mes heures cette semaine</div>
                  <div className="text-2xl font-semibold">
                    {formatHours(hours)} <span className="text-base font-normal">/ {me.contractHours} h</span>
                  </div>
                  {meta?.publishedAt && <div className="mt-1 text-xs text-brand-100">Publié le {new Date(meta.publishedAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</div>}
                </div>
                <div className="space-y-2">
                  {DAYS.map((d, day) => {
                    const list = mine.filter((s) => s.day === day).sort((a, b) => a.start.localeCompare(b.start));
                    return (
                      <Card key={day} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{d}</span>
                          <span className="text-xs text-slate-500">{formatDayDate(w, day)}</span>
                        </div>
                        {list.length === 0 ? (
                          <div className="mt-1 text-sm text-slate-500">Repos</div>
                        ) : (
                          <ul className="mt-1.5 space-y-1.5">
                            {list.map((s) => {
                              const p = post(s.postId);
                              const pending = (state.requests ?? []).some((r) => r.type === "swap" && r.shiftId === s.id && r.status === "pending");
                              return (
                                <li key={s.id} className="flex flex-wrap items-center gap-2">
                                  <Clock size={14} className="text-slate-500" />
                                  <span className="text-[15px] font-medium tabular-nums">
                                    {formatTime(s.start)} – {formatTime(s.end)}
                                  </span>
                                  {p && <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", POST_COLORS[p.color].soft)}>{p.name}</span>}
                                  <span className="flex-1" />
                                  {pending ? (
                                    <span className="text-xs font-medium text-amber-800">Échange en attente</span>
                                  ) : (
                                    <Button size="sm" variant="ghost" onClick={() => setSwapOf(s)}>
                                      <ArrowLeftRight size={14} /> Échanger
                                    </Button>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <Requests key={me.id} employeeId={me.id} requests={myRequests} onSend={send} />
        )}
      </div>

      {swapOf && (
        <SwapModal
          shift={swapOf}
          week={w}
          employeeId={me.id}
          onClose={() => setSwapOf(null)}
          onSend={(toId) => {
            send({ type: "swap", employeeId: me.id, week: w, shiftId: swapOf.id, toEmployeeId: toId } as Omit<TeamRequest, "id" | "status" | "createdAt">, "Échange envoyé au gérant");
            setSwapOf(null);
          }}
        />
      )}
    </div>
  );
}

function SwapModal({ shift, week, employeeId, onClose, onSend }: { shift: Shift; week: string; employeeId: string; onClose: () => void; onSend: (toId: string) => void }) {
  const { state } = useApp();
  const candidates = state.employees
    .filter((e) => !e.archived && e.id !== employeeId && e.postIds.includes(shift.postId))
    .map((e) => ({ e, problems: swapProblems(state, { id: "x", employeeId, status: "pending", createdAt: "", type: "swap", week, shiftId: shift.id, toEmployeeId: e.id }) }))
    .sort((a, b) => a.problems.length - b.problems.length);
  return (
    <Modal open onClose={onClose} title={`Échanger mon ${DAYS[shift.day].toLowerCase()} ${formatTime(shift.start)}–${formatTime(shift.end)}`}>
      <p className="mb-3 text-sm text-slate-600">Choisissez la personne qui a accepté de vous remplacer. Le gérant valide ensuite : Quinzo vérifie les repos et les heures avant.</p>
      <ul className="divide-y divide-slate-100">
        {candidates.map(({ e, problems }) => (
          <li key={e.id}>
            <button disabled={problems.length > 0} onClick={() => onSend(e.id)} className="flex min-h-11 w-full items-center gap-3 py-2 text-left disabled:opacity-60">
              <Avatar id={e.id} name={`${e.firstName} ${e.lastName}`} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{e.firstName}</span>
                <span className={cx("block text-xs", problems.length ? "text-red-700" : "text-emerald-700")}>{problems.length ? `Pas possible : ${problems[0].title.replace(`${e.firstName} `, "").replace(`${e.firstName} : `, "")}` : "Possible"}</span>
              </span>
              {!problems.length && <span className="text-xs font-semibold text-brand-700">Proposer</span>}
            </button>
          </li>
        ))}
        {candidates.length === 0 && <li className="py-3 text-sm text-slate-600">Personne d&apos;autre n&apos;a ce poste.</li>}
      </ul>
    </Modal>
  );
}

function Requests({ employeeId, requests, onSend }: { employeeId: string; requests: TeamRequest[]; onSend: (r: Omit<TeamRequest, "id" | "status" | "createdAt">, msg: string) => void }) {
  const { state } = useApp();
  const me = state.employees.find((e) => e.id === employeeId)!;
  const [open, setOpen] = useState<"leave" | "dispo" | null>(null);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setOpen("leave")} className="flex min-h-20 flex-col items-start justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xs">
          <CalendarOff size={18} className="text-brand-700" />
          <span className="text-sm font-semibold">Demander un congé</span>
        </button>
        <button onClick={() => setOpen("dispo")} className="flex min-h-20 flex-col items-start justify-center gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xs">
          <CalendarRange size={18} className="text-brand-700" />
          <span className="text-sm font-semibold">Mes disponibilités</span>
        </button>
      </div>

      <Card className="p-4">
        <div className="mb-2 text-sm font-semibold">Mes demandes</div>
        {requests.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune demande pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...requests].reverse().map((r) => (
              <li key={r.id} className="flex items-start gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1">{requestSummary(state, r).replace(`${me.firstName} `, "").replace(/^demande/, "Demande").replace(/^propose/, "Proposé :").replace(/^: /, "")}</span>
                <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", r.status === "pending" ? "bg-amber-50 text-amber-900" : r.status === "accepted" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700")}>
                  {r.status === "pending" ? "En attente" : r.status === "accepted" ? "Acceptée" : "Refusée"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open === "leave" && <LeaveModal onClose={() => setOpen(null)} onSend={(r) => (onSend({ ...r, type: "leave", employeeId } as Omit<TeamRequest, "id" | "status" | "createdAt">, "Demande envoyée au gérant"), setOpen(null))} />}
      {open === "dispo" && (
        <DispoModal
          initial={{ unavailability: me.unavailability, prefs: me.prefs }}
          onClose={() => setOpen(null)}
          onSend={(un, prefs, text) => (onSend({ type: "availability", employeeId, unavailability: un, preferences: prefs, text } as Omit<TeamRequest, "id" | "status" | "createdAt">, "Disponibilités envoyées au gérant"), setOpen(null))}
        />
      )}
    </div>
  );
}

function LeaveModal({ onClose, onSend }: { onClose: () => void; onSend: (r: { absenceType: AbsenceType; start: string; end: string; note?: string }) => void }) {
  const today = toISODate(new Date());
  const [type, setType] = useState<AbsenceType>("cp");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [note, setNote] = useState("");
  const ok = start && end && end >= start;
  return (
    <Modal
      open
      onClose={onClose}
      title="Demander un congé"
      footer={
        <>
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" disabled={!ok} onClick={() => onSend({ absenceType: type, start, end, note: note.trim() || undefined })}>
            <Send size={15} /> Envoyer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {(["cp", "repos"] as AbsenceType[]).map((t) => (
            <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className={cx("min-h-11 rounded-full border px-3 text-[13px] font-medium", type === t ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700")}>
              {ABSENCE_TYPES[t].label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Du">
            <input type="date" className={inputClass} value={start} min={today} onChange={(e) => (setStart(e.target.value), e.target.value > end && setEnd(e.target.value))} />
          </Field>
          <Field label="Au (inclus)">
            <input type="date" className={inputClass} value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Petit mot (facultatif)" hint="Pas de motif médical : ce n'est jamais demandé.">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. mariage de ma sœur" maxLength={120} />
        </Field>
      </div>
    </Modal>
  );
}

function DispoModal({ initial, onClose, onSend }: { initial: { unavailability: Unavailability[]; prefs?: EmployeePrefs }; onClose: () => void; onSend: (un: Unavailability[], prefs: EmployeePrefs | undefined, text: string) => void }) {
  const { state } = useApp();
  const [un, setUn] = useState(initial.unavailability);
  const [prefs, setPrefs] = useState(initial.prefs);
  const never = (d: number) => un.some((u) => u.day === d && u.serviceId === "all");
  const toggle = (d: number) => setUn((l) => (never(d) ? l.filter((u) => u.day !== d) : [...l.filter((u) => u.day !== d), { day: d, serviceId: "all" }]));

  function describe() {
    const days = DAYS.filter((_, d) => never(d)).map((d) => d.toLowerCase());
    const parts = [days.length ? `jamais le ${days.join(", ")}` : "disponible tous les jours"];
    const pref = (prefs?.preferredServices ?? []).map((id) => state.services.find((s) => s.id === id)?.name.toLowerCase()).filter(Boolean);
    if (pref.length) parts.push(`préfère le ${pref.join(" ou le ")}`);
    for (const w of prefs?.timeWindows ?? []) if (w.days.length && (w.from || w.to)) parts.push(`${w.from ? `pas avant ${formatTime(w.from)}` : ""}${w.from && w.to ? ", " : ""}${w.to ? `pas après ${formatTime(w.to)}` : ""} le ${w.days.map((d) => DAYS[d].toLowerCase()).join(", ")}`);
    return `nouvelles disponibilités : ${parts.join(" ; ")}`;
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Mes disponibilités"
      footer={
        <>
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={() => onSend(un, prefs, describe())}>
            <Send size={15} /> Envoyer au gérant
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-sm font-medium">Jours où je ne peux jamais travailler</div>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {DAYS.map((d, i) => (
              <button key={i} type="button" aria-pressed={never(i)} onClick={() => toggle(i)} className={cx("flex h-11 items-center justify-center gap-1 rounded-lg border text-[13px] font-medium", never(i) ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 text-slate-700")}>
                {never(i) && <Check size={13} />}
                {d.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>
        <PrefsEditor prefs={prefs} services={state.services} onChange={setPrefs} />
        <p className="text-xs text-slate-500">Le gérant valide avant que ce soit pris en compte dans les prochains plannings.</p>
      </div>
    </Modal>
  );
}

