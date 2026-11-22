import Link from "next/link";
import { ArrowRight, BedDouble, Coffee, Croissant, MessageCircle, Scale, Scissors, ShieldCheck, Sparkles, Store, UtensilsCrossed } from "lucide-react";
import { Logo } from "@/components/Logo";

// Page d'accueil (vitrine). Identité : bandeau encre, terracotta, titres en Bricolage Grotesque.

const TRADES = [
  { icon: UtensilsCrossed, label: "Restaurants" },
  { icon: Coffee, label: "Bars et cafés" },
  { icon: Croissant, label: "Boulangeries" },
  { icon: Store, label: "Boutiques" },
  { icon: Scissors, label: "Salons" },
  { icon: BedDouble, label: "Hôtels" },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-page">
      {/* ---- Bandeau d'ouverture --------------------------------------------- */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-brand-600/25 blur-3xl" aria-hidden />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Logo tone="dark" />
          <nav className="flex items-center gap-1">
            <Link href="/connexion" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
              Connexion
            </Link>
            <Link href="/inscription" className="hidden min-h-11 items-center rounded-lg bg-white px-4 text-sm font-semibold text-ink hover:bg-brand-50 sm:inline-flex">
              Créer un compte
            </Link>
          </nav>
        </header>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-8 pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:pt-14 lg:pb-28">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/85">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden /> Planning d&apos;équipe pour les commerces et la restauration
            </p>
            <h1 className="font-display text-[44px] leading-[1.02] font-extrabold sm:text-6xl lg:text-7xl">
              <span className="block text-white/55 line-through decoration-brand-400 decoration-4">3 heures le dimanche soir.</span>
              <span className="mt-2 block">
                15 minutes, <span className="text-brand-300">café compris.</span>
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/85">
              Quinzo prépare le planning de toute votre équipe en respectant les contrats, les repos et votre convention collective. Vous ajustez, vous l&apos;envoyez sur WhatsApp. C&apos;est bouclé.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/etablissements" className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-[15px] font-semibold text-white shadow-lg shadow-black/20 hover:bg-brand-700">
                Essayer avec un restaurant d&apos;exemple <ArrowRight size={18} />
              </Link>
              <Link href="/inscription" className="inline-flex h-13 items-center justify-center rounded-xl border border-white/25 px-6 text-[15px] font-semibold text-white hover:bg-white/10">
                Créer mon compte
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/70">Sans carte bancaire. Vos données restent en Europe.</p>
          </div>

          <PhoneMock />
        </div>
      </section>

      {/* ---- Pour qui ----------------------------------------------------------- */}
      <section className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-6 text-sm font-medium text-slate-700">
          {TRADES.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-2">
              <Icon size={17} className="text-brand-700" aria-hidden /> {label}
            </span>
          ))}
        </div>
      </section>

      {/* ---- Ce que Quinzo fait à votre place ----------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl">Le casse-tête du planning, Quinzo le prend pour lui.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Feature
            icon={Sparkles}
            title="La semaine remplie en un clic"
            text="Disponibilités, heures du contrat, jours de repos à la suite, week-ends partagés équitablement : tout est pris en compte avant même que vous regardiez."
            detail="56 créneaux remplis en moins d'une seconde dans notre restaurant d'exemple."
          />
          <Feature
            icon={Scale}
            title="Les règles vérifiées à chaque geste"
            text="11 h de repos, 35 h d'affilée dans la semaine, pause dès 6 h, amplitude, heures sup : un déplacement de trop et vous le voyez tout de suite, en rouge."
            detail="Choisissez votre convention collective, les limites s'ajustent."
          />
          <Feature
            icon={MessageCircle}
            title="L'équipe prévenue en un message"
            text="Un lien à envoyer sur WhatsApp : chacun voit ses horaires sur son téléphone, sans compte. Un PDF à afficher en cuisine, un export Excel pour le comptable."
            detail="Absent de dernière minute ? Les remplaçants possibles sont proposés en un tap."
          />
        </div>
      </section>

      {/* ---- Comment ça marche (vraie séquence) ---------------------------------- */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Trois étapes, et la semaine est prête.</h2>
            <p className="mt-4 text-slate-700">
              Plusieurs restaurants ou boutiques ? Un seul compte : chaque établissement a son équipe, ses horaires et ses règles.
            </p>
          </div>
          <ol className="space-y-4">
            {[
              ["Racontez votre établissement", "Horaires, postes, coupures ou journée continue, convention : un questionnaire de 10 minutes, une seule fois."],
              ["Générez la semaine", "Quinzo propose un planning complet. Vous glissez un créneau ici ou là, les alertes vous guident."],
              ["Envoyez-le à l'équipe", "Un lien, un message WhatsApp, un PDF. La semaine suivante, copiez ou réappliquez un roulement en un clic."],
            ].map(([t, x], i) => (
              <li key={t} className="flex gap-5 rounded-2xl border border-slate-200/80 bg-page p-5">
                <span className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-lg font-bold text-white">{i + 1}</span>
                <span>
                  <span className="font-display block text-lg font-semibold">{t}</span>
                  <span className="mt-1 block text-slate-700">{x}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- Dernier appel ---------------------------------------------------- */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-brand-600 p-8 text-white sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Votre prochain dimanche soir est libre.</h2>
            <p className="mt-2 text-white/90">Essayez sur notre restaurant d&apos;exemple, ou créez votre établissement en 10 minutes.</p>
          </div>
          <Link href="/etablissements" className="inline-flex h-13 shrink-0 items-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-brand-800 hover:bg-brand-50">
            Essayer maintenant <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-700" aria-hidden /> Données hébergées dans l&apos;Union européenne
          </span>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, text, detail }: { icon: typeof Sparkles; title: string; text: string; detail: string }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-xs ring-1 ring-slate-200/80">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700" aria-hidden>
        <Icon size={20} />
      </span>
      <h3 className="font-display mt-5 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-slate-700">{text}</p>
      <p className="mt-auto border-t border-slate-100 pt-4 text-sm font-medium text-brand-800">{detail}</p>
    </div>
  );
}

/** Aperçu du produit dans un téléphone : la journée de samedi, tout est en règle. */
function PhoneMock() {
  const services = [
    { name: "Midi", hours: "11h – 15h", rows: [["Salle", ["Camille", "Lucas", "Inès"]], ["Cuisine", ["Thomas", "Karim"]]] },
    { name: "Soir", hours: "18h – 23h", rows: [["Salle", ["Hugo", "Lucas", "Manon"]], ["Bar", ["Léa", "Nathan"]]] },
  ] as const;
  const dot: Record<string, string> = { Salle: "bg-blue-500", Cuisine: "bg-teal-500", Bar: "bg-violet-500" };
  return (
    <div className="relative mx-auto mb-8 w-full max-w-[340px]" aria-label="Aperçu de l'application sur téléphone" role="img">
      <div className="rounded-[2.4rem] bg-[color:var(--color-slate-900)] p-2.5 shadow-2xl shadow-black/40 ring-1 ring-white/10">
        <div className="overflow-hidden rounded-[1.9rem] bg-page text-ink">
          <div className="flex items-center justify-between bg-white px-4 py-3">
            <span className="font-display text-sm font-bold">Le Comptoir des Halles</span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">En règle</span>
          </div>
          <div className="flex gap-1 px-3 pt-3">
            {["Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, i) => (
              <span key={d} className={`flex-1 rounded-lg py-1.5 text-center text-[10px] font-semibold ${i === 4 ? "bg-brand-600 text-white" : "bg-white text-slate-700"}`}>
                {d}
              </span>
            ))}
          </div>
          <div className="space-y-2.5 p-3">
            {services.map((s, si) => (
              <div key={s.name} className="rounded-xl bg-white p-3 shadow-xs">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-xs font-bold">{s.name}</span>
                  <span className="text-[10px] text-slate-600">{s.hours}</span>
                </div>
                {s.rows.map(([post, names], ri) => (
                  <div key={post} className="mb-1.5 flex flex-wrap items-center gap-1 last:mb-0">
                    <span className={`h-1.5 w-1.5 rounded-full ${dot[post]}`} aria-hidden />
                    <span className="w-12 text-[10px] font-medium text-slate-700">{post}</span>
                    {names.map((n, k) => (
                      <span key={n} className="mock-chip rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium" style={{ animationDelay: `${(si * 5 + ri * 3 + k) * 110}ms` }}>
                        {n}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
            <div className="rounded-xl bg-white p-3 shadow-xs">
              <div className="mb-1 flex justify-between text-[10px] font-medium text-slate-700">
                <span>Heures de la semaine</span>
                <span>Camille 35/35 h</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100">
                <div className="h-full w-full rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 rounded-2xl bg-white px-4 py-3 text-center whitespace-nowrap text-ink shadow-xl lg:left-0 lg:-translate-x-10">
        <div className="text-[11px] font-medium text-slate-600">Semaine bouclée en</div>
        <div className="font-display text-2xl font-extrabold tabular-nums">12 min 40</div>
      </div>
    </div>
  );
}
