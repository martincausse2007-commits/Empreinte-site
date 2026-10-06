import { SectionHeading } from "./SectionHeading";

const faqs = [
  {
    q: "Quel format de logo dois-je fournir ?",
    a: "Idéalement un fichier vectoriel (SVG, PDF, AI). Un PNG en haute résolution sur fond transparent convient aussi très bien.",
  },
  {
    q: "Y a-t-il une quantité minimale ?",
    a: "Nous travaillons à partir de petites séries. Indiquez vos besoins dans le formulaire de contact et nous vous proposerons le format le plus adapté.",
  },
  {
    q: "Quels sont les délais de fabrication ?",
    a: "Ils dépendent du produit et des quantités. Le délai précis est indiqué sur le devis, après validation de la maquette.",
  },
  {
    q: "Mon logo est-il envoyé quand j'utilise le configurateur ?",
    a: "Non. L'aperçu est calculé entièrement dans votre navigateur ; aucun fichier n'est transmis tant que vous ne nous l'envoyez pas vous-même.",
  },
  {
    q: "Peut-on créer un produit qui n'est pas dans la liste ?",
    a: "Oui. Décrivez votre idée : l'impression 3D permet de concevoir des pièces sur mesure, et nous étudions chaque demande.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-stone-200 bg-white">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading eyebrow="FAQ" title="Questions fréquentes" />
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-stone-900">
                {f.q}
                <span
                  aria-hidden
                  className="text-xl leading-none text-amber-700 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
