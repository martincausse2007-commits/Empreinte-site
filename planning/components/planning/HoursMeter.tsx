import { formatHours } from "@/lib/time";
import { cx } from "../ui";

export function HoursMeter({ hours, contract, compact }: { hours: number; contract: number; compact?: boolean }) {
  const over = hours > contract + 0.01;
  const pct = Math.min(100, (hours / Math.max(1, contract)) * 100);
  const tone = over ? "bg-red-500" : hours >= contract - 0.01 ? "bg-emerald-500" : "bg-brand-500";
  return (
    <div className={cx("flex items-center gap-2", compact ? "w-full" : "")}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={cx("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cx("shrink-0 text-xs tabular-nums", over ? "font-semibold text-red-600" : "text-slate-500")}>
        {formatHours(hours).replace(" ", "")}
        <span className="text-slate-500">/{contract}h</span>
      </span>
    </div>
  );
}
