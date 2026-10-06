import { nav, site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-stone-950 text-stone-400">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-10">
        <div>
          <p className="font-display text-lg text-stone-100">{site.name}</p>
          <p>{site.tagline}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Pied de page">
          {[...nav, { href: "#contact", label: "Contact" }].map((item) => (
            <a key={item.href} href={item.href} className="hover:text-stone-100">
              {item.label}
            </a>
          ))}
        </nav>
        <p>© {new Date().getFullYear()} {site.name}</p>
      </div>
    </footer>
  );
}
