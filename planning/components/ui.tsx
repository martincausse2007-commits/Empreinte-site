"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Minus, Plus, X } from "lucide-react";
import { avatarColor } from "@/lib/colors";
import { useBack, useHistoryLayer } from "@/lib/history";

import { cx } from "@/lib/cx";
export { cx };

type Variant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20",
  secondary: "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 shadow-xs",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
  whatsapp: "bg-whatsapp text-white hover:bg-whatsapp-hover",
};

type Size = "sm" | "md" | "lg" | "icon";

/** Classes d'un bouton, réutilisables sur un lien (<Link className={buttonClass(...)}>). */
export function buttonClass(variant: Variant = "secondary", size: Size = "md", className?: string) {
  return cx(
        "inline-flex items-center justify-center gap-2 rounded-lg [&_svg]:shrink-0 font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        // Hauteur minimale de 44 px au doigt (mobile), plus compacte à la souris
        size === "sm" && "h-11 px-3 text-[13px] sm:h-8",
        size === "md" && "h-11 px-4 text-sm sm:h-10",
        size === "lg" && "h-12 px-5 text-[15px]",
        size === "icon" && "h-11 w-11 shrink-0 sm:h-10 sm:w-10",
        VARIANTS[variant],
        className,
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button {...props} className={buttonClass(variant, size, className)} />;
}

export function Avatar({ id, name, size = 32 }: { id: string; name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", avatarColor(id))}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-2xl border border-slate-200/80 bg-white shadow-xs", className)}>{children}</div>;
}

export function Stepper({ value, onChange, min = 0, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        aria-label="Moins"
        className="flex h-11 w-11 items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30 sm:h-8 sm:w-8"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus size={14} />
      </button>
      <span className={cx("w-7 text-center text-sm font-semibold tabular-nums", value === 0 && "text-slate-500")}>{value}</span>
      <button
        type="button"
        aria-label="Plus"
        className="flex h-11 w-11 items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30 sm:h-8 sm:w-8"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/** Fenêtre : centrée sur ordinateur, panneau qui monte du bas sur mobile. */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  // Bouton retour du téléphone et touche Échap ferment la fenêtre
  useHistoryLayer(open, onClose);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          "animate-sheet sm:animate-pop relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-md",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2 sm:pt-5">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Fermer" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && (
          <div className="flex gap-2 border-t border-slate-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-[15px] outline-none transition placeholder:text-slate-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:h-10 sm:text-sm";

// ---- Notifications (toasts) -------------------------------------------------

type Toast = { id: number; text: string };
const ToastCtx = createContext<(text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} className="animate-pop flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
            <CheckCircle2 size={16} className="text-emerald-400" />
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`);

/** Choix d'une heure par pas de 15 min, affichée « 11h30 » (identique sur tous les téléphones). */
export function TimeSelect({ value, onChange, className, id }: { value: string; onChange: (v: string) => void; className?: string; id?: string }) {
  const opts = TIME_OPTIONS.includes(value) ? TIME_OPTIONS : [...TIME_OPTIONS, value].sort();
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cx("h-11 rounded-lg border border-slate-200 bg-white px-2 text-sm tabular-nums outline-none focus:border-brand-500 sm:h-10", className)}>
      {opts.map((t) => (
        <option key={t} value={t}>
          {t.endsWith(":00") ? `${Number(t.slice(0, 2))}h` : `${Number(t.slice(0, 2))}h${t.slice(3)}`}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-12 shrink-0 items-center justify-center"
    >
      <span className={cx("relative h-6 w-11 rounded-full transition", checked ? "bg-brand-600" : "bg-slate-400")}>
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

/** Flèche « ← Retour » en haut des écrans secondaires. */
export function BackButton({ fallback, label = "Retour", onClick, className }: { fallback: string; label?: string; onClick?: () => void; className?: string }) {
  const back = useBack(fallback);
  return (
    <button
      type="button"
      onClick={onClick ?? back}
      className={cx("-ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-ink", className)}
    >
      <ArrowLeft size={18} />
      {label}
    </button>
  );
}
