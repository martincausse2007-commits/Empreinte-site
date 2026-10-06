export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 70% at 85% 10%, rgba(217,119,6,0.14) 0%, transparent 60%), radial-gradient(50% 60% at 0% 100%, rgba(120,113,108,0.12) 0%, transparent 60%)",
        }}
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 pb-20 pt-16 sm:px-10 sm:pt-24 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700">
            Impression 3D · Restauration
          </p>
          <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-stone-900 sm:text-6xl">
            Votre identité, <em className="text-amber-800">jusque sur la table.</em>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-stone-600">
            Supports, sets de table, présentoirs et porte-bouteilles fabriqués en
            impression 3D et personnalisés avec le logo de votre restaurant. Petites
            séries, délais courts, finitions soignées.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="#produits"
              className="rounded-full bg-stone-900 px-6 py-3 text-sm font-medium text-stone-50 transition-colors hover:bg-amber-800"
            >
              Essayer avec mon logo
            </a>
            <a
              href="#contact"
              className="rounded-full border border-stone-300 bg-white/60 px-6 py-3 text-sm font-medium text-stone-800 transition-colors hover:border-stone-900"
            >
              Demander un devis
            </a>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-4">
          {[
            { k: "4", v: "produits personnalisables" },
            { k: "Petites", v: "séries, sans moule ni minimum industriel" },
            { k: "Instantané", v: "aperçu de votre logo en ligne" },
            { k: "Sur mesure", v: "formes, couleurs et zones de marquage" },
          ].map((s) => (
            <li
              key={s.v}
              className="flex flex-col gap-1 rounded-2xl border border-stone-200 bg-white/70 p-5 shadow-sm"
            >
              <span className="font-display text-3xl text-stone-900">{s.k}</span>
              <span className="text-sm text-stone-600">{s.v}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
