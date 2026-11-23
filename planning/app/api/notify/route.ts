// Envoi des notifications à l'équipe (planning publié, changements, créneau à prendre,
// réponse à une demande). Gratuit : notifications du navigateur (web push) et, si un
// service d'e-mails est configuré (Brevo, offre gratuite), un e-mail. Jamais de SMS.
//
// Sécurité : l'appel se fait AVEC la session du gérant. Les lectures passent par les
// règles RLS : un gérant ne peut prévenir que les salariés de ses établissements.
// Aucune clé secrète Supabase n'est utilisée ici.

import { NextResponse } from "next/server";
import webpush from "web-push";
import { getServerSupabase } from "@/lib/supabase/server";
import { isCloudConfigured } from "@/lib/supabase/config";
import { notifyEmail, notifyMessage, type NotifyKind } from "@/lib/notify-text";

const KINDS: NotifyKind[] = ["published", "changes", "urgent", "open", "answered"];
const recent = new Map<string, number[]>(); // limite simple : 20 envois par minute et par gérant

type Body = { establishmentId?: string; kind?: NotifyKind; employeeIds?: string[]; weekLabel?: string; detail?: string; accepted?: boolean };

export async function POST(request: Request) {
  if (!isCloudConfigured) return NextResponse.json({ error: "Comptes non configurés" }, { status: 503 });
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { establishmentId, kind, employeeIds = [] } = body;
  if (!establishmentId || !kind || !KINDS.includes(kind) || !Array.isArray(employeeIds) || employeeIds.length > 80) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const clip = (t?: string) => (typeof t === "string" ? t.slice(0, 140) : undefined);

  const sb = await getServerSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  const now = Date.now();
  const mine = (recent.get(auth.user.id) ?? []).filter((t) => now - t < 60000);
  if (mine.length >= 20) return NextResponse.json({ error: "Trop d'envois, réessayez dans une minute" }, { status: 429 });
  recent.set(auth.user.id, [...mine, now]);

  // Membre de cet établissement ? (RLS : sinon la ligne est invisible)
  const { data: est } = await sb.from("establishments").select("id, name").eq("id", establishmentId).maybeSingle();
  if (!est) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { data: people } = await sb.from("employees").select("id, user_id, email").eq("establishment_id", establishmentId).eq("archived", false).in("id", employeeIds.map(String));
  const users = (people ?? []).map((p) => p.user_id).filter(Boolean) as string[];
  const { data: subs } = users.length ? await sb.from("push_subscriptions").select("endpoint, p256dh, auth, user_id").in("user_id", users) : { data: [] };

  const msg = notifyMessage(kind, { establishment: est.name, weekLabel: clip(body.weekLabel), detail: clip(body.detail), accepted: !!body.accepted });
  let push = 0;
  let email = 0;
  const reached = new Set<string>();

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv && subs?.length) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contact@example.com", pub, priv);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 3600 * 12, urgency: kind === "urgent" ? "high" : "normal" });
          push++;
          reached.add(String(s.user_id));
        } catch {
          /* abonnement expiré : le salarié le renouvellera en ouvrant l'application */
        }
      }),
    );
  }

  // E-mail : à ceux qui n'ont pas reçu de notification (ou toujours en cas d'urgence)
  const key = process.env.BREVO_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL;
  if (key && from) {
    const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const mail = notifyEmail(msg, site);
    const targets = (people ?? []).filter((p) => p.email && (kind === "urgent" || !p.user_id || !reached.has(String(p.user_id))));
    await Promise.all(
      targets.map(async (p) => {
        const r = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ sender: { email: from, name: "Quinzo" }, to: [{ email: p.email }], subject: mail.subject, textContent: mail.text, htmlContent: mail.html }),
        }).catch(() => null);
        if (r?.ok) email++;
      }),
    );
  }

  return NextResponse.json({ push, email, people: people?.length ?? 0 });
}
