import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  zone: string;
  children: ReactNode;
};

export function ProductCard({ title, description, zone, children }: Props) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div
        className="aspect-[4/3] w-full"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 20%, #f7f5f1 0%, #eae6dd 55%, #ddd7c9 100%)",
        }}
      >
        {children}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 border-t border-stone-100 p-5">
        <h3 className="font-semibold text-stone-900">{title}</h3>
        <p className="text-sm text-stone-600">{description}</p>
        <p className="mt-auto pt-3 text-xs font-medium uppercase tracking-wide text-amber-700">
          {zone}
        </p>
      </div>
    </div>
  );
}
