import { cx } from "@/lib/cx";

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-600 shadow-sm shadow-brand-600/30">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
          <rect x="4" y="5" width="7" height="5" rx="1.6" fill="white" />
          <rect x="13" y="5" width="7" height="5" rx="1.6" fill="white" opacity=".55" />
          <rect x="4" y="12" width="7" height="7" rx="1.6" fill="white" opacity=".55" />
          <rect x="13" y="12" width="7" height="7" rx="1.6" fill="white" />
        </svg>
      </span>
      {withText && <span className="text-[17px] font-semibold tracking-tight">Créno</span>}
    </span>
  );
}
