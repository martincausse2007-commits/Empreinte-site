// Configuration Supabase lue dans les variables d'environnement (jamais écrite dans le code).
// Si elles sont absentes, l'application fonctionne en mode Démo uniquement.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Les comptes (Supabase) sont-ils configurés sur ce site ? */
export const isCloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Adresse publique du site, pour les liens envoyés par e-mail. */
export function siteUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
