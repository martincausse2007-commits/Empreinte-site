"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isCloudConfigured } from "./config";

let client: SupabaseClient | null = null;

/** Client Supabase côté navigateur (null si les comptes ne sont pas configurés). */
export function getSupabase(): SupabaseClient | null {
  if (!isCloudConfigured) return null;
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

/** Messages d'erreur de connexion, en français simple. */
export function authErrorFr(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("fetch") || m.includes("network") || m.includes("load failed")) return "Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.";
  if (m.includes("invalid login credentials")) return "E-mail ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Confirmez d'abord votre adresse e-mail avec le lien reçu par e-mail.";
  if (m.includes("user already registered")) return "Un compte existe déjà avec cet e-mail. Connectez-vous ou réinitialisez le mot de passe.";
  if (m.includes("password should be at least") || m.includes("weak password")) return "Mot de passe trop faible : 8 caractères minimum, avec lettres et chiffres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  if (m.includes("same password")) return "Le nouveau mot de passe doit être différent de l'ancien.";
  if (m.includes("expired") || m.includes("invalid") ) return "Ce lien a expiré ou n'est plus valable. Demandez-en un nouveau.";
  return "Une erreur est survenue. Réessayez dans un instant.";
}
