import { SectionHeading } from "./SectionHeading";

const steps = [
  {
    title: "Envoyez votre logo",
    text: "Un fichier PNG, JPG ou SVG suffit. Testez-le d'abord dans le configurateur pour visualiser le rendu.",
  },
  {
    title: "Validez la maquette",
    text: "Nous préparons un bon à tirer avec dimensions, couleurs et zone de marquage pour chaque produit.",
  },
  {
    title: "Fabrication",
    text: "Impression 3D, marquage couleur ou gravure, puis contrôle qualité pièce par pièce.",
  },
  {
    title: "Livraison",
    text: "Vos pièces arrivent prêtes à l'emploi, emballées par lot pour une mise en place rapide en salle.",
  },
];

export function HowItWorks() {
  return (
    <section id="fonctionnement" className="scroll-mt-20 border-y border-stone-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-20 sm:px-10">
        <SectionHeading eyebrow="Fonctionnement" title="De votre logo à votre salle, en quatre étapes" />
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3">
              <span className="font-display text-5xl text-amber-700/80">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-semibold text-stone-900">{step.title}</h3>
              <p className="text-sm leading-relaxed text-stone-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
