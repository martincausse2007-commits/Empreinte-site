"use client";

import { AlertTriangle } from "lucide-react";
import { POST_COLORS } from "@/lib/colors";
import { formatTime } from "@/lib/time";
import type { Post, Shift } from "@/lib/types";
import { cx } from "../ui";

export function ShiftChip({
  shift,
  post,
  showPost,
  error,
  dragging,
  className,
}: {
  shift: Shift;
  post?: Post;
  showPost?: boolean;
  error?: boolean;
  dragging?: boolean;
  className?: string;
}) {
  const c = POST_COLORS[post?.color ?? "slate"];
  return (
    <div
      className={cx(
        "group/chip relative w-full rounded-lg border px-2 py-1.5 text-left select-none",
        c.chip,
        error && "border-red-300 ring-2 ring-red-400/70",
        dragging ? "rotate-[-1.5deg] shadow-xl" : "shadow-xs hover:shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-1 text-[12.5px] leading-tight font-semibold tabular-nums">
        {error && <AlertTriangle size={12} className="shrink-0 text-red-600" />}
        <span className="truncate">
          {formatTime(shift.start)} – {formatTime(shift.end)}
        </span>
      </div>
      {showPost && post && (
        <div className="mt-0.5 flex items-center gap-1 text-[11px]">
          <span className={cx("h-1.5 w-1.5 rounded-full", c.dot)} />
          {post.name}
        </div>
      )}
    </div>
  );
}
