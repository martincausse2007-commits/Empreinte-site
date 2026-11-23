"use client";

// L'espace salarié : planning publié, heures, créneaux à prendre, échanges,
// congés, disponibilités, agenda et notifications. Le même écran sert à
// l'aperçu « Voir comme un salarié » (démo) et au vrai compte salarié (/moi).

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeftRight, Bell, BellOff, CalendarOff, CalendarPlus, CalendarRange, Check, ChevronLeft, ChevronRight, Clock, Hand, Send, Share, X, Zap } from "lucide-react";
import type { AbsenceType, EmployeePrefs, Shift, TeamRequest, Unavailability } from "@/lib/types";
import { hoursByEmployee } from "@/lib/rules";
import { DAYS, formatDayDate, formatHours, formatTime, formatWeekRange, mondayOf, toISODate } from "@/lib/time";
import { ABSENCE_TYPES } from "@/lib/absences";
import { POST_COLORS } from "@/lib/colors";
import { icsFor } from "@/lib/ics";
import type { Space, SpaceActions, NewRequest } from "@/lib/employee-space";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push-client";
import { Avatar, Button, Card, Field, Modal, cx, inputClass, useToast } from "../ui";
import { PrefsEditor } from "../team/PrefsEditor";

type Tab = "planning" | "a-prendre" | "demandes";
const DAYS_LOWER = DAYS.map((d) => d.toLowerCase());

export function EmployeeSpaceView({ space, actions, top, demo }: { space: Space; actions: SpaceActions; top?: ReactNode; demo?: boolean }) {
  const toast = useToast();
  const weeks = useMemo(() => Object.keys(space.weeks).sort(), [space.weeks]);
  const thisMonday = mondayOf(new Date());
  const defaultWeek = weeks.includes(thisMonday) ? thisMonday : (weeks.find((w) => w > thisMonday) ?? weeks[weeks.length - 1]);
  const [week, setWeek] = useState<string | undefined>(undefined);
  const w = week && weeks.includes(week) ? week : defaultWeek;
  const [tab, setTab] = useState<Tab>("planning");
  const [swapOf, setSwapOf] = useState<Shift | null>(null);
  const [busy, setBusy] = useState(false);

  // Arrivée depuis une notification (#a-prendre, #demandes)
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture de l'adresse au chargement
    if (h === "a-prendre" || h === "demandes") setTab(h);
  }, []);

  // Accusé de lecture : la version publiée affichée est notée comme vue
  const current = w ? space.weeks[w] : undefined;
  const marked = useRef<string>("");
  useEffect(() => {
    if (!w || !current?.publishedAt || tab !== "planning") return;
    const key = `${space.id}|${space.me.id}|${w}|${current.publishedAt}`;
    if (marked.current === key || (space.reads[w] ?? "") >= current.publishedAt) return;
    marked.current = key;
    void actions.markRead(w, current.publishedAt);
  }, [w, current?.publishedAt, tab, space.id, space.me.id, space.reads, actions]);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
    } catch {
      toast("Impossible pour le moment. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  const open = weeks.flatMap((wk) => space.weeks[wk].openShifts.map((o) => ({ week: wk, o }))).filter(({ week: wk }) => wk >= thisMonday);
  const incoming = space.requests.filter((r) => r.type === "swap" && r.status === "peer" && r.toEmployeeId === space.me.id);
  const pendingMine = space.requests.filter((r) => r.employeeId === space.me.id && (r.status === "pending" || r.status === "peer")).length;
  const name = (id: string) => space.colleagues.find((c) => c.id === id)?.firstName ?? "Un collègue";
  const post = (id: string) => space.posts.find((p) => p.id === id);

  function downloadIcs() {
    const list = weeks.filter((wk) => wk >= thisMonday).map((wk) => ({ week: wk, shifts: space.weeks[wk].snapshot.filter((s) => s.employeeId === space.me.id) }));
    const ics = icsFor({ establishment: space.name, weeks: list, postName: (id) => post(id)?.name ?? "Travail" });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `planning-${space.me.firstName.toLowerCase()}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(demo ? "Dans la démo, le téléchargement peut être bloqué : il marche dans l'application" : "Fichier agenda téléchargé : ouvrez-le pour l'ajouter");
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-16">
      {top}

      <div className="mb-4 grid grid-cols-3 rounded-xl bg-slate-200/60 p-1" role="tablist">
        {(
          [
            ["planning", "Planning", 0],
            ["a-prendre", "À prendre", open.length],
            ["demandes", "Demandes", incoming.length + pendingMine],
          ] as const
        ).map(([t, label, n]) => (
          <button key={t} role="tab" onClick={() => setTab(t)} aria-selected={tab === t} className={cx("relative min-h-11 rounded-lg text-sm font-medium", tab === t ? "bg-white shadow-sm" : "text-slate-600")}>
            {label}
            {n > 0 && <span className={cx("ml-1 rounded-full px-1.5 text-[11px] font-semibold", t === "a-prendre" ? "bg-brand-600 text-white" : "bg-slate-800 text-white")}>{n}</span>}
          </button>
        ))}
      </div>

      {tab === "planning" && (
        <>
          {!w ? (
            <Card className="p-6 text-center text-sm text-slate-600">Aucun planning publié pour l&apos;instant. Vous serez prévenu·e dès qu&apos;il le sera.</Card>
          ) : (
            <PlanningTab
              space={space}
              week={w}
              weeks={weeks}
              onWeek={setWeek}
              onSwap={setSwapOf}
              onIcs={downloadIcs}
            />
          )}
          <NotificationsCard demo={demo} />
        </>
      )}

      {tab === "a-prendre" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Créneaux proposés à vous (et à d&apos;autres). Le gérant valide le premier volontaire, après avoir vérifié vos repos et vos heures.</p>
          {open.length === 0 && <Card className="p-6 text-center text-sm text-slate-600">Rien à prendre en ce moment.</Card>}
          {open.map(({ week: wk, o }) => {
            const mine = space.requests.find((r) => r.type === "claim" && r.openId === o.id && r.employeeId === space.me.id && r.status !== "cancelled");
            const p = post(o.postId);
            const problems = actions.check?.claim({ id: "x", type: "claim", employeeId: space.me.id, status: "pending", createdAt: "", week: wk, openId: o.id }) ?? [];
            return (
              <Card key={o.id} className={cx("p-4", o.urgent && "border-brand-300")}>
                <div className="flex items-start gap-3">
                  <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", o.urgent ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700")}>{o.urgent ? <Zap size={18} /> : <Hand size={18} />}</span>
                  <div className="min-w-0 flex-1">
                    {o.urgent && <div className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Remplacement urgent</div>}
                    <div className="font-semibold">
                      {DAYS[o.day]} {formatDayDate(wk, o.day)} · {formatTime(o.start)}–{formatTime(o.end)}
                    </div>
                    <div className="text-sm text-slate-600">
                      {p?.name}
                      {o.note ? ` · ${o.note}` : ""}
                    </div>
                    {problems.length > 0 && <div className="mt-1 text-xs font-medium text-red-700">Pas possible pour vous : {problems[0].title.replace(`${space.me.firstName} `, "")}</div>}
                  </div>
                </div>
                <div className="mt-3">
                  {mine ? (
                    <div className={cx("rounded-lg px-3 py-2 text-sm font-medium", mine.status === "accepted" ? "bg-emerald-50 text-emerald-800" : mine.status === "refused" ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-900")}>
                      {mine.status === "accepted" ? "C'est validé : le créneau est à vous." : mine.status === "refused" ? "Un autre volontaire a été retenu." : "Demande envoyée : le gérant va valider."}
                    </div>
                  ) : (
                    <Button variant="primary" className="w-full" disabled={busy || problems.length > 0} onClick={() => run(() => actions.send({ type: "claim", employeeId: space.me.id, week: wk, openId: o.id } as NewRequest), "Envoyé : le gérant va valider")}>
                      <Hand size={16} /> Je le prends
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "demandes" && <RequestsTab space={space} actions={actions} busy={busy} run={run} incoming={incoming} name={name} />}

      {swapOf && w && (
        <SwapModal
          space={space}
          shift={swapOf}
          week={w}
          actions={actions}
          onClose={() => setSwapOf(null)}
          onSend={(toId) => {
            const s = swapOf;
            setSwapOf(null);
            void run(() => actions.send({ type: "swap", employeeId: space.me.id, week: w, shiftId: s.id, toEmployeeId: toId } as NewRequest), `Proposé à ${name(toId)} : il ou elle doit accepter, puis le gérant valide`);
          }}
        />
      )}
    </div>
  );
}

function PlanningTab({ space, week, weeks, onWeek, onSwap, onIcs }: { space: Space; week: string; weeks: string[]; onWeek: (w: string) => void; onSwap: (s: Shift) => void; onIcs: () => void }) {
  const data = space.weeks[week];
  const mine = data.snapshot.filter((s) => s.employeeId === space.me.id);
  const hours = hoursByEmployee(data.snapshot)[space.me.id] ?? 0;
  const i = weeks.indexOf(week);
  const post = (id: string) => space.posts.find((p) => p.id === id);
  const pendingSwap = (id: string) => space.requests.some((r) => r.type === "swap" && r.shiftId === id && (r.status === "pending" || r.status === "peer"));
  const absentOn = (day: number) => {
    const d = toISODate(new Date(new Date(week + "T12:00:00").getTime() + day * 86400000));
    return space.absences.find((a) => a.start <= d && d <= a.end);
  };
  return (
    <>
      <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white">
        <button className="flex h-12 w-12 items-center justify-center text-slate-600 disabled:opacity-30" disabled={i <= 0} onClick={() => onWeek(weeks[i - 1])} aria-label="Semaine précédente">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold">{formatWeekRange(week)}</span>
        <button className="flex h-12 w-12 items-center justify-center text-slate-600 disabled:opacity-30" disabled={i >= weeks.length - 1} onClick={() => onWeek(weeks[i + 1])} aria-label="Semaine suivante">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-4 rounded-2xl bg-brand-600 p-4 text-white">
        <div className="text-sm">Mes heures cette semaine</div>
        <div className="text-2xl font-semibold">
          {formatHours(hours)} <span className="text-base font-normal">/ {space.me.contractHours} h</span>
        </div>
        {data.publishedAt && <div className="mt-1 text-xs text-brand-100">Publié le {new Date(data.publishedAt).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</div>}
      </div>

      <div className="space-y-2">
        {DAYS.map((d, day) => {
          const list = mine.filter((s) => s.day === day).sort((a, b) => a.start.localeCompare(b.start));
          const abs = absentOn(day);
          return (
            <Card key={day} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{d}</span>
                <span className="text-xs text-slate-500">{formatDayDate(week, day)}</span>
              </div>
              {list.length === 0 ? (
                <div className="mt-1 text-sm text-slate-500">{abs ? ABSENCE_TYPES[abs.type].label : "Repos"}</div>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {list.map((s) => {
                    const p = post(s.postId);
                    return (
                      <li key={s.id} className="flex flex-wrap items-center gap-2">
                        <Clock size={14} className="text-slate-500" />
                        <span className="text-[15px] font-medium tabular-nums">
                          {formatTime(s.start)} – {formatTime(s.end)}
                        </span>
                        {p && <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", POST_COLORS[p.color].soft)}>{p.name}</span>}
                        <span className="flex-1" />
                        {pendingSwap(s.id) ? (
                          <span className="text-xs font-medium text-amber-800">Échange en cours</span>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => onSwap(s)}>
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

      <Button className="mt-4 w-full" onClick={onIcs}>
        <CalendarPlus size={16} /> Ajouter à mon agenda
      </Button>
      <p className="mt-1.5 text-center text-xs text-slate-500">Google Agenda, Apple Calendrier ou Outlook. À refaire après un changement.</p>
    </>
  );
}

function RequestsTab({ space, actions, busy, run, incoming, name }: { space: Space; actions: SpaceActions; busy: boolean; run: (fn: () => Promise<void>, ok: string) => Promise<void>; incoming: TeamRequest[]; name: (id: string) => string }) {
  const [open, setOpen] = useState<"leave" | "dispo" | null>(null);
  const mine = space.requests.filter((r) => r.employeeId === space.me.id);
  const shiftOf = (r: Extract<TeamRequest, { type: "swap" }>) => space.weeks[r.week]?.snapshot.find((s) => s.id === r.shiftId);
  const slot = (s?: { day: number; start: string; end: string }) => (s ? `${DAYS_LOWER[s.day]} ${formatTime(s.start)}–${formatTime(s.end)}` : "un créneau");
  const text = (r: TeamRequest) => {
    if (r.type === "leave") return `${ABSENCE_TYPES[r.absenceType].label} ${r.start === r.end ? `le ${fmt(r.start)}` : `du ${fmt(r.start)} au ${fmt(r.end)}`}`;
    if (r.type === "availability") return r.text.charAt(0).toUpperCase() + r.text.slice(1);
    if (r.type === "claim") {
      const o = space.weeks[r.week]?.openShifts.find((x) => x.id === r.openId);
      return `Prendre le créneau du ${slot(o)}`;
    }
    return `Échange du ${slot(shiftOf(r))} avec ${name(r.toEmployeeId)}`;
  };
  const status = (r: TeamRequest) =>
    r.status === "peer" ? ["En attente de " + (r.type === "swap" ? name(r.toEmployeeId) : "réponse"), "bg-amber-50 text-amber-900"] : r.status === "pending" ? ["Le gérant va répondre", "bg-amber-50 text-amber-900"] : r.status === "accepted" ? ["Acceptée", "bg-emerald-50 text-emerald-800"] : r.status === "refused" ? ["Refusée", "bg-slate-100 text-slate-700"] : ["Annulée", "bg-slate-100 text-slate-600"];

  return (
    <div className="space-y-3">
      {incoming.map((r) => {
        const s = r.type === "swap" ? shiftOf(r) : undefined;
        return (
          <Card key={r.id} className="border-brand-200 p-4">
            <div className="flex items-start gap-3">
              <ArrowLeftRight size={18} className="mt-0.5 shrink-0 text-brand-700" />
              <div className="text-sm">
                <b>{name(r.employeeId)}</b> vous propose son créneau du <b>{slot(s)}</b>. Si vous acceptez, le gérant valide ensuite.
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" disabled={busy} onClick={() => run(() => actions.answerPeer(r.id, false), "Proposition refusée")}>
                <X size={15} /> Refuser
              </Button>
              <Button variant="primary" className="flex-1" disabled={busy} onClick={() => run(() => actions.answerPeer(r.id, true), "Accepté : le gérant va valider")}>
                <Check size={15} /> Accepter
              </Button>
            </div>
          </Card>
        );
      })}

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
        {mine.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune demande pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {[...mine].reverse().map((r) => {
              const [label, tone] = status(r);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">{text(r)}</span>
                  <span className={cx("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", tone)}>{label}</span>
                  {(r.status === "pending" || r.status === "peer") && (
                    <button className="min-h-9 text-xs font-medium text-slate-600 underline underline-offset-2" disabled={busy} onClick={() => run(() => actions.cancel(r.id), "Demande annulée")}>
                      Annuler
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {open === "leave" && (
        <LeaveModal
          onClose={() => setOpen(null)}
          onSend={(r) => {
            setOpen(null);
            void run(() => actions.send({ ...r, type: "leave", employeeId: space.me.id } as NewRequest), "Demande envoyée au gérant");
          }}
        />
      )}
      {open === "dispo" && (
        <DispoModal
          space={space}
          onClose={() => setOpen(null)}
          onSend={(un, prefs, t) => {
            setOpen(null);
            void run(() => actions.send({ type: "availability", employeeId: space.me.id, unavailability: un, preferences: prefs, text: t } as NewRequest), "Disponibilités envoyées au gérant");
          }}
        />
      )}
    </div>
  );
}

const fmt = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

function SwapModal({ space, shift, week, actions, onClose, onSend }: { space: Space; shift: Shift; week: string; actions: SpaceActions; onClose: () => void; onSend: (toId: string) => void }) {
  const candidates = space.colleagues
    .filter((c) => c.id !== space.me.id && c.postIds.includes(shift.postId))
    .map((c) => ({ c, problems: actions.check?.swap({ id: "x", employeeId: space.me.id, status: "pending", createdAt: "", type: "swap", week, shiftId: shift.id, toEmployeeId: c.id }) ?? [] }))
    .sort((a, b) => a.problems.length - b.problems.length);
  return (
    <Modal open onClose={onClose} title={`Échanger mon ${DAYS_LOWER[shift.day]} ${formatTime(shift.start)}–${formatTime(shift.end)}`}>
      <p className="mb-3 text-sm text-slate-600">Choisissez à qui le proposer. La personne accepte dans son application, puis le gérant valide après avoir vérifié les repos et les heures.</p>
      <ul className="divide-y divide-slate-100">
        {candidates.map(({ c, problems }) => (
          <li key={c.id}>
            <button disabled={problems.length > 0} onClick={() => onSend(c.id)} className="flex min-h-11 w-full items-center gap-3 py-2 text-left disabled:opacity-60">
              <Avatar id={c.id} name={c.firstName} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{c.firstName}</span>
                {actions.check && <span className={cx("block text-xs", problems.length ? "text-red-700" : "text-emerald-700")}>{problems.length ? `Pas possible : ${problems[0].title.replace(`${c.firstName} : `, "").replace(`${c.firstName} `, "")}` : "Possible"}</span>}
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
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
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
        <Field label="Petit mot (facultatif)" hint="Jamais de motif médical : ce n'est pas demandé.">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex. mariage de ma sœur" maxLength={120} />
        </Field>
      </div>
    </Modal>
  );
}

function DispoModal({ space, onClose, onSend }: { space: Space; onClose: () => void; onSend: (un: Unavailability[], prefs: EmployeePrefs | undefined, text: string) => void }) {
  const [un, setUn] = useState(space.me.unavailability);
  const [prefs, setPrefs] = useState(space.me.prefs);
  const never = (d: number) => un.some((u) => u.day === d && u.serviceId === "all");
  const toggle = (d: number) => setUn((l) => (never(d) ? l.filter((u) => u.day !== d) : [...l.filter((u) => u.day !== d), { day: d, serviceId: "all" }]));

  function describe() {
    const days = DAYS_LOWER.filter((_, d) => never(d));
    const parts = [days.length ? `jamais le ${days.join(", ")}` : "disponible tous les jours"];
    const pref = (prefs?.preferredServices ?? []).map((id) => space.services.find((s) => s.id === id)?.name.toLowerCase()).filter(Boolean);
    if (pref.length) parts.push(`préfère le ${pref.join(" ou le ")}`);
    for (const w of prefs?.timeWindows ?? []) if (w.days.length && (w.from || w.to)) parts.push(`${w.from ? `pas avant ${formatTime(w.from)}` : ""}${w.from && w.to ? ", " : ""}${w.to ? `pas après ${formatTime(w.to)}` : ""} le ${w.days.map((d) => DAYS_LOWER[d]).join(", ")}`);
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
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
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
        <PrefsEditor prefs={prefs} services={space.services} onChange={setPrefs} />
        <p className="text-xs text-slate-500">Le gérant valide avant que ce soit pris en compte dans les prochains plannings.</p>
      </div>
    </Modal>
  );
}

/** Activer les notifications du téléphone (gratuites). */
function NotificationsCard({ demo }: { demo?: boolean }) {
  const [st, setSt] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => {
    if (demo) return;
    void pushState().then(setSt);
  }, [demo]);
  if (demo)
    return (
      <Card className="mt-4 flex items-start gap-3 p-4 text-sm text-slate-700">
        <Bell size={18} className="mt-0.5 shrink-0 text-brand-700" />
        <span>Dans l&apos;application, le salarié reçoit une notification gratuite quand son planning est publié ou change, et pour un remplacement urgent.</span>
      </Card>
    );
  if (!st || st === "unsupported" || st === "not-configured") return null;
  if (st === "ios-install")
    return (
      <Card className="mt-4 p-4 text-sm text-slate-700">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <Bell size={16} className="text-brand-700" /> Recevoir les notifications sur iPhone
        </div>
        Touchez <Share size={14} className="inline align-[-2px]" /> <b>Partager</b>, puis <b>« Sur l&apos;écran d&apos;accueil »</b>. Ouvrez ensuite Quinzo depuis l&apos;icône et revenez ici.
      </Card>
    );
  return (
    <Card className="mt-4 flex items-center gap-3 p-4">
      {st === "on" ? <Bell size={18} className="shrink-0 text-emerald-700" /> : <BellOff size={18} className="shrink-0 text-slate-500" />}
      <span className="min-w-0 flex-1 text-sm">
        {st === "on" ? "Notifications activées sur cet appareil." : st === "denied" ? "Notifications bloquées : autorisez-les dans les réglages du navigateur." : "Être prévenu·e quand le planning change."}
      </span>
      {st !== "denied" && (
        <Button
          size="sm"
          variant={st === "on" ? "ghost" : "primary"}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const next = st === "on" ? await disablePush() : await enablePush();
              setSt(next);
              toast(next === "on" ? "Notifications activées" : "Notifications coupées");
            } catch {
              toast("Activation impossible pour le moment");
            } finally {
              setBusy(false);
            }
          }}
        >
          {st === "on" ? "Couper" : "Activer"}
        </Button>
      )}
    </Card>
  );
}
