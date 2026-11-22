"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, FileDown, Link2, MessageCircle } from "lucide-react";
import { useApp } from "@/lib/store";
import { whatsappText } from "@/lib/share";
import { formatWeekRange } from "@/lib/time";
import { Button, Card, PageHeader, buttonClass, cx, useToast } from "@/components/ui";
import { PrintSheet } from "@/components/PrintSheet";

export default function SharePage() {
  const { state, ready } = useApp();
  const toast = useToast();
  const week = state.currentWeek;
  const shifts = useMemo(() => state.plans[week] ?? [], [state.plans, week]);
  const [mode, setMode] = useState<"day" | "person">("person");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  // L'adresse du site n'est connue que dans le navigateur
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrigin(window.location.origin);
  }, []);

  const link = `${origin}/p/${state.shareToken}`;
  const text = whatsappText(state, week, shifts, mode, link);

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* certains navigateurs bloquent le presse-papier */
    }
    setCopied(key);
    toast("Copié dans le presse-papier");
    setTimeout(() => setCopied(null), 1800);
  }

  if (!ready) return null;

  return (
    <div>
      <PageHeader title="Partager le planning" subtitle={`Semaine du ${formatWeekRange(week)} · ${shifts.length} créneaux`} />

      {shifts.length === 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Cette semaine est encore vide. <Link href="/planning" className="font-semibold underline">Générez-la d&apos;abord</Link> pour partager un planning complet.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="min-w-0 space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Link2 size={18} />
              </span>
              <div>
                <div className="font-medium">Lien en lecture seule</div>
                <div className="text-sm text-slate-500">L&apos;équipe consulte le planning sans compte, sur téléphone.</div>
              </div>
            </div>
            <div className="flex gap-2">
              <input readOnly value={link} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600" />
              <Button onClick={() => copy(link, "link")} aria-label="Copier le lien" size="icon">
                {copied === "link" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </Button>
              <Link href={`/p/${state.shareToken}`} aria-label="Ouvrir la page de l'équipe" className={buttonClass("secondary", "icon")}>
                <ExternalLink size={16} />
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <FileDown size={18} />
              </span>
              <div>
                <div className="font-medium">Export PDF</div>
                <div className="text-sm text-slate-500">Un tableau A4 paysage, prêt à imprimer et à afficher en cuisine.</div>
              </div>
            </div>
            <Button onClick={() => window.print()} className="w-full">
              <FileDown size={16} /> Télécharger le PDF
            </Button>
            <p className="mt-2 text-xs text-slate-500">Dans la fenêtre qui s&apos;ouvre, choisissez « Enregistrer au format PDF ».</p>
          </Card>
        </div>

        <Card className="flex min-w-0 flex-col p-5">
          {/* En-tête : sur téléphone, le choix « par personne / par jour » passe sous le titre */}
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-whatsapp-bubble text-whatsapp">
                <MessageCircle size={18} />
              </span>
              <div className="min-w-0">
                <div className="font-medium">Message WhatsApp</div>
                <div className="text-sm text-slate-600">À coller dans le groupe de l&apos;équipe.</div>
              </div>
            </div>
            <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-0.5 text-sm sm:text-xs" role="group" aria-label="Présentation du message">
              {(["person", "day"] as const).map((m) => (
                <button
                  key={m}
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={cx("min-h-11 rounded-md px-3 font-medium sm:min-h-8", mode === m ? "bg-white shadow-sm" : "text-slate-600")}
                >
                  {m === "person" ? "Par personne" : "Par jour"}
                </button>
              ))}
            </div>
          </div>
          <pre className="mb-3 max-h-[420px] flex-1 overflow-auto rounded-xl bg-whatsapp-chat p-4 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-slate-800 [overflow-wrap:anywhere]">
            <span className="block rounded-lg bg-whatsapp-bubble p-3 shadow-xs">{text}</span>
          </pre>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => copy(text, "wa")} className="sm:flex-1">
              {copied === "wa" ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />} Copier le texte
            </Button>
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className={buttonClass("whatsapp", "md", "sm:flex-1")}>
              <MessageCircle size={16} /> Ouvrir WhatsApp
            </a>
          </div>
        </Card>
      </div>

      <PrintSheet state={state} week={week} shifts={shifts} />
    </div>
  );
}
