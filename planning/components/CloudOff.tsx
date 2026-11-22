import Link from "next/link";

/** Affiché quand les comptes ne sont pas encore configurés sur ce site (pas de clés Supabase). */
export function CloudOff() {
  return (
    <div className="space-y-4 text-sm text-slate-700">
      <p className="rounded-xl bg-slate-50 p-4">
        Les comptes ne sont pas encore activés sur ce site. En attendant, vous pouvez tout essayer en <b>mode démo</b> : vos données restent sur cet appareil.
      </p>
      <Link href="/planning" className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-600 px-4 font-medium text-white hover:bg-brand-700">
        Essayer la démo
      </Link>
      <Link href="/configuration" className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-200 px-4 font-medium hover:bg-slate-50">
        Configurer mon établissement (démo)
      </Link>
    </div>
  );
}
