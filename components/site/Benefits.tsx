import { SectionHeading } from "./SectionHeading";

const benefits = [
  {
    title: "Petites séries rentables",
    text: "L'impression 3D ne demande aucun moule : commandez dix pièces ou cent, sans surcoût de lancement.",
  },
  {
    title: "Sur mesure",
    text: "Dimensions, couleurs et zones de marquage sont ajustées à votre mobilier et à votre charte graphique.",
  },
  {
    title: "Robuste au quotidien",
    text: "Matériaux choisis pour résister aux manipulations du service et à un nettoyage régulier.",
  },
  {
    title: "Réassort simplifié",
    text: "Votre modèle est conservé : recommandez une pièce cassée ou un complément à l'identique.",
  },
];

export function Benefits() {
  return (
    <section id="atouts" className="scroll-mt-20">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[1fr_1.4fr]">
        <SectionHeading eyebrow="Atouts" title="Pensé pour la réalité d'une salle de restaurant">
          Des objets utiles qui prolongent votre identité de marque, sans les
          contraintes de la production industrielle.
        </SectionHeading>
        <ul className="grid gap-4 sm:grid-cols-2">
          {benefits.map((b) => (
            <li key={b.title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-stone-900">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{b.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
