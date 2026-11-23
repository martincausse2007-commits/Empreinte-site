// Textes des notifications (web push et e-mail). Courts, sans donnée sensible :
// jamais d'horaires de collègues, jamais de motif d'absence.

export type NotifyKind = "published" | "changes" | "urgent" | "open" | "answered";

export type NotifyMessage = { title: string; body: string; url: string; tag: string };

export function notifyMessage(kind: NotifyKind, p: { establishment: string; weekLabel?: string; detail?: string; accepted?: boolean }): NotifyMessage {
  const url = "/moi";
  switch (kind) {
    case "published":
      return { title: `Planning publié · ${p.establishment}`, body: `Votre planning de la semaine du ${p.weekLabel} est disponible.`, url, tag: `pub-${p.weekLabel}` };
    case "changes":
      return { title: `Planning modifié · ${p.establishment}`, body: p.detail ? `Changement : ${p.detail}` : `Vos horaires de la semaine du ${p.weekLabel} ont changé.`, url, tag: `chg-${p.weekLabel}` };
    case "urgent":
      return { title: `Remplacement urgent · ${p.establishment}`, body: `${p.detail ?? "Un créneau"} est à prendre. Premier volontaire validé par le gérant.`, url: "/moi#a-prendre", tag: `urg-${p.detail}` };
    case "open":
      return { title: `Créneau à prendre · ${p.establishment}`, body: `${p.detail ?? "Un créneau"} est proposé à l'équipe.`, url: "/moi#a-prendre", tag: `open-${p.detail}` };
    case "answered":
      return { title: `Réponse à votre demande · ${p.establishment}`, body: `${p.detail ?? "Votre demande"} : ${p.accepted ? "acceptée" : "refusée"}.`, url: "/moi#demandes", tag: `ans-${p.detail}` };
  }
}

/** E-mail texte + HTML très simple (lisible partout, sans image ni suivi). */
export function notifyEmail(m: NotifyMessage, siteUrl: string) {
  const link = `${siteUrl.replace(/\/$/, "")}${m.url}`;
  const text = `${m.body}\n\nOuvrir mon planning : ${link}\n\n— Quinzo. Vous recevez ce message car votre employeur vous a ajouté à son planning.`;
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#2f3e46;line-height:1.5"><p>${esc(m.body)}</p><p><a href="${esc(link)}" style="display:inline-block;background:#b4442a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Ouvrir mon planning</a></p><p style="font-size:12px;color:#5b6770">Quinzo. Vous recevez ce message car votre employeur vous a ajouté à son planning.</p></div>`;
  return { subject: m.title, text, html };
}
