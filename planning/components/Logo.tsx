import { cx } from "@/lib/cx";

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-600 shadow-sm shadow-brand-600/30">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
          {/* Un cadran avec un quart rempli : un quart d'heure = 15 minutes */}
          <circle cx="12" cy="12" r="8.5" stroke="white" strokeWidth="2.2" />
          <path d="M12 12V5.2A6.8 6.8 0 0 1 18.8 12Z" fill="white" />
        </svg>
      </span>
      {withText && <span className="text-[17px] font-semibold tracking-tight">Quinzo</span>}
    </span>
  );
}
