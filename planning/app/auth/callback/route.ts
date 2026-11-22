// Retour des liens envoyés par e-mail (confirmation, lien magique, mot de passe oublié).
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";
import { isCloudConfigured } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next") ?? "/etablissements";
  // Uniquement des redirections internes (jamais vers un autre site)
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/planning";

  if (!isCloudConfigured) return NextResponse.redirect(new URL("/connexion", url.origin));
  const supabase = await getServerSupabase();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("lien incomplet") };

  if (error) return NextResponse.redirect(new URL("/connexion?erreur=lien", url.origin));
  return NextResponse.redirect(new URL(next, url.origin));
}
