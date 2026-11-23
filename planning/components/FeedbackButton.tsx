"use client";

// « Donner mon avis » : ouvre un e-mail prérempli vers le créateur de Quinzo.
// L'adresse vient de la variable NEXT_PUBLIC_FEEDBACK_EMAIL (jamais écrite dans le code).

import { useState } from "react";
import { Check, Copy, Mail, MessageSquareHeart } from "lucide-react";
import { Button, Modal, buttonClass, cx } from "./ui";

export const FEEDBACK_EMAIL = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL ?? "";

const TEMPLATE = `Bonjour,

Mon commerce (type, nombre de salariés) :

Ce qui m'a plu :

Ce qui m'a bloqué ou agacé :

Ce qui me manque pour l'utiliser vraiment :

Je paierais combien par mois ? :

Merci !`;

export function FeedbackButton({ className, compact }: { className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(TEMPLATE);
  const [copied, setCopied] = useState(false);
  const subject = "Mon avis sur Quinzo";
  const href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(FEEDBACK_EMAIL ? `À : ${FEEDBACK_EMAIL}\nObjet : ${subject}\n\n${text}` : text);
    } catch {
      /* presse-papier bloqué : le texte reste sélectionnable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={cx("inline-flex min-h-11 items-center gap-1.5 font-semibold sm:min-h-0", className)}>
        <MessageSquareHeart size={16} /> {compact ? "Avis" : "Donner mon avis"}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Donner mon avis"
        footer={
          <>
            <Button onClick={copy} className="flex-1">
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />} Copier
            </Button>
            {FEEDBACK_EMAIL && (
              <a href={href} target="_blank" rel="noreferrer" className={buttonClass("primary", "md", "flex-1")}>
                <Mail size={16} /> Ouvrir mon e-mail
              </a>
            )}
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Deux minutes suffisent. Dites-nous franchement ce qui marche et ce qui coince.
          {FEEDBACK_EMAIL ? (
            <>
              {" "}Si l&apos;e-mail ne s&apos;ouvre pas, copiez le texte et envoyez-le à <b className="font-semibold text-slate-800 select-all">{FEEDBACK_EMAIL}</b>.
            </>
          ) : (
            " L'adresse de contact n'est pas encore réglée : copiez le texte pour le garder."
          )}
        </p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={13} className="w-full rounded-lg border border-slate-200 p-3 text-[15px] leading-relaxed outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:text-sm" aria-label="Votre avis" />
      </Modal>
    </>
  );
}
