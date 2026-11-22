import { cx } from "@/lib/cx";

/** Logo Quinzo : un cadran dont un quart est rempli (un quart d'heure = 15 minutes). */
export function Logo({ className, withText = true, tone = "light" }: { className?: string; withText?: boolean; tone?: "light" | "dark" }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-600 shadow-sm shadow-brand-900/20">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="8.5" stroke="white" strokeWidth="2.2" />
          <path d="M12 12V5.2A6.8 6.8 0 0 1 18.8 12Z" fill="white" />
        </svg>
      </span>
      {withText && <span className={cx("font-display text-[19px] font-bold", tone === "dark" ? "text-white" : "text-ink")}>Quinzo</span>}
    </span>
  );
}
