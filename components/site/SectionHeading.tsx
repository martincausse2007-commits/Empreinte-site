type Props = {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
};

export function SectionHeading({ eyebrow, title, children }: Props) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700">{eyebrow}</p>
      <h2 className="font-display text-3xl tracking-tight text-stone-900 sm:text-4xl">{title}</h2>
      {children && <p className="leading-relaxed text-stone-600">{children}</p>}
    </div>
  );
}
