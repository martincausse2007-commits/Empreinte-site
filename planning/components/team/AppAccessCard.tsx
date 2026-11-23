"use client";

// Fiche salarié : accès à l'application (lien d'invitation), e-mail pour les notifications.

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle, Smartphone, UserCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import type { Employee } from "@/lib/types";
import { Button, Card, buttonClass, cx, inputClass, useConfirm, useToast } from "../ui";

export function AppAccessCard({ employee, email, onEmail, isNew }: { employee: Employee; email: string; onEmail: (v: string) => void; isNew: boolean }) {
  const { mode, activeId, update } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- adresse du site connue seulement dans le navigateur
    setOrigin(window.location.origin);
  }, []);
  const emailOk = !email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  async function invite() {
    if (mode !== "cloud" || !activeId) return;
    setBusy(true);
    const { data, error } = (await getSupabase()?.rpc("create_invite", { p_est: activeId, p_employee: employee.id })) ?? { data: null, error: new Error() };
    setBusy(false);
    if (error || !data) return toast("Lien impossible à créer. Enregistrez d'abord la fiche, puis réessayez.");
    setLink(`${origin}/rejoindre?code=${data}`);
  }

  async function unlink() {
    if (!(await confirm({ title: `Retirer l'accès de ${employee.firstName} ?`, text: "Son compte ne verra plus votre planning. Vous pourrez l'inviter à nouveau.", confirmLabel: "Retirer", danger: true }))) return;
    const { error } = (await getSupabase()?.from("employees").update({ user_id: null }).eq("establishment_id", activeId).eq("id", employee.id)) ?? { error: new Error() };
    if (error) return toast("Impossible pour le moment");
    update((s) => ({ ...s, employees: s.employees.map((e) => (e.id === employee.id ? { ...e, linked: undefined } : e)) }));
    toast("Accès retiré");
  }

  const message = `Bonjour ${employee.firstName}, voici le lien pour voir votre planning sur votre téléphone (valable 14 jours, à usage unique) : ${link}`;

  return (
    <Card className="mt-4 p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Smartphone size={18} className="text-slate-500" /> Application salarié
      </h2>
      <p className="mt-1 mb-4 text-sm text-slate-600">
        {employee.firstName || "Le salarié"} voit son planning publié, ses heures, prend des créneaux libres, demande un congé ou un échange. Gratuit pour lui.
      </p>

      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium text-slate-700">E-mail pour les notifications (facultatif)</span>
        <input type="email" inputMode="email" className={cx(inputClass, !emailOk && "border-red-300")} value={email} onChange={(e) => onEmail(e.target.value.trim())} placeholder="prenom@exemple.fr" />
        <span className="mt-1 block text-xs text-slate-500">Utilisé seulement pour prévenir du planning publié, des changements et des remplacements urgents. Vous avez besoin de son accord.</span>
      </label>

      <div className="mt-4 border-t border-slate-100 pt-4">
        {mode !== "cloud" ? (
          <p className="text-sm text-slate-600">
            Avec un compte, un bouton crée ici un lien d&apos;invitation à envoyer par WhatsApp ou SMS depuis votre téléphone. En démo : essayez « Voir comme un salarié » dans le menu « … » du planning.
          </p>
        ) : isNew ? (
          <p className="text-sm text-slate-600">Enregistrez la fiche, puis revenez ici pour l&apos;inviter.</p>
        ) : employee.linked ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex flex-1 items-center gap-2 text-sm font-medium text-emerald-800">
              <UserCheck size={16} /> Compte relié : {employee.firstName} reçoit le planning publié.
            </span>
            <Button size="sm" variant="ghost" onClick={() => void unlink()}>
              Retirer l&apos;accès
            </Button>
          </div>
        ) : link ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input readOnly value={link} className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 sm:h-10" aria-label="Lien d'invitation" />
              <Button
                size="icon"
                aria-label="Copier le lien"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                  } catch {
                    /* le lien reste sélectionnable */
                  }
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </Button>
            </div>
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className={buttonClass("whatsapp", "md", "w-full")}>
              <MessageCircle size={16} /> Envoyer par WhatsApp
            </a>
            <p className="text-xs text-slate-500">À usage unique, valable 14 jours. Il crée son accès avec son e-mail et son mot de passe.</p>
          </div>
        ) : (
          <Button variant="primary" onClick={() => void invite()} disabled={busy}>
            <Smartphone size={16} /> Inviter sur l&apos;application
          </Button>
        )}
      </div>
    </Card>
  );
}
