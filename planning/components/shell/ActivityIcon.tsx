import { BedDouble, Briefcase, Coffee, Croissant, Scissors, ShoppingBasket, Sparkles, Store, UtensilsCrossed } from "lucide-react";
import type { ActivityId } from "@/lib/types";
import { cx } from "@/lib/cx";

export const ACTIVITY_ICONS: Record<ActivityId, typeof Store> = {
  restaurant: UtensilsCrossed,
  bar: Coffee,
  boulangerie: Croissant,
  boutique: Store,
  supermarche: ShoppingBasket,
  beaute: Scissors,
  hotel: BedDouble,
  agence: Briefcase,
  autre: Sparkles,
};

export function ActivityIcon({ type, className, small }: { type: ActivityId; className?: string; small?: boolean }) {
  const Icon = ACTIVITY_ICONS[type] ?? Sparkles;
  return (
    <span className={cx("flex shrink-0 items-center justify-center rounded-lg", small ? "h-8 w-8" : "h-9 w-9", className)} aria-hidden>
      <Icon size={small ? 15 : 17} />
    </span>
  );
}
