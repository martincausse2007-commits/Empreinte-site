import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { BackButton } from "./ui";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="min-h-dvh px-4 py-4">
      <BackButton fallback="/" />
      <div className="flex flex-col items-center justify-center py-8">
        <Link href="/" className="mb-8" aria-label="Quinzo, accueil">
          <Logo />
        </Link>
        <div className="w-full max-w-[420px] rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-slate-600">{subtitle}</p>
          {children}
        </div>
        <div className="mt-6 text-sm text-slate-600">{footer}</div>
      </div>
    </div>
  );
}
