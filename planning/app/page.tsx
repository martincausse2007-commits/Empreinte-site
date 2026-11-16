import Link from "next/link";
import { ArrowRight, Bell, CalendarCheck2, Clock, MessageCircle, Repeat, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";

const FEATURES = [
  { icon: Sparkles, title: "Génération automatique", text: "Un clic remplit la semaine selon vos besoins et les disponibilités." },
  { icon: Bell, title: "Alertes en direct", text: "Heures dépassées, repos de 11 h, poste non couvert : tout est signalé." },
  { icon: Repeat, title: "Modèles et roulements", text: "Semaine type ou roulement sur 2 ou 4 semaines, réappliqué en 1 clic." },
  { icon: MessageCircle, title: "Partage WhatsApp", text: "Lien en lecture seule, PDF et texte prêt à envoyer à l'équipe." },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/connexion" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Connexion
          </Link>
          <Link href="/inscription" className="hidden rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:block">
            Créer un compte
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-10 pb-16 text-center sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          <Clock size={13} /> Restaurants, commerces, salons, hôtels…
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Le planning de votre équipe en <span className="text-brand-600">15 minutes</span>, pas 3 heures.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-500 text-balance">
          Quinzo génère la semaine en respectant contrats, repos et disponibilités. Vous ajustez, vous partagez, c&apos;est fini.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/planning" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 font-medium text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 sm:w-auto">
            Essayer la démo <ArrowRight size={18} />
          </Link>
          <Link href="/inscription" className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 px-6 font-medium hover:bg-slate-50 sm:w-auto">
            Créer mon établissement
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5">
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-600 shadow-xs">
              <Icon size={19} />
            </span>
            <div className="font-semibold">{title}</div>
            <p className="mt-1 text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        <CalendarCheck2 size={14} className="mr-1 inline" /> Quinzo — maquette de démonstration
      </footer>
    </div>
  );
}
