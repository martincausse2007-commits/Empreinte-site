"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { LogoUploader } from "./LogoUploader";
import { ProductCard } from "./ProductCard";
import { PhoneStandMockup } from "./mockups/PhoneStandMockup";
import { PlacematMockup } from "./mockups/PlacematMockup";
import { MenuDisplayMockup } from "./mockups/MenuDisplayMockup";

const WineBottleScene = dynamic(
  () => import("./three/WineBottleScene").then((mod) => mod.WineBottleScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-stone-400">
        Rendu 3D en cours de chargement…
      </div>
    ),
  },
);

export function Configurator() {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoName, setLogoName] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 sm:px-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-widest text-amber-700">
          Configurateur de démonstration
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Votre logo, imprimé sur toute votre vaisselle
        </h1>
        <p className="max-w-2xl text-stone-600">
          Importez le logo de votre restaurant et voyez-le appliqué instantanément sur
          plusieurs produits imprimés en 3D. Aucune donnée n&apos;est envoyée à un
          serveur&nbsp;: tout se passe dans votre navigateur.
        </p>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-stone-50/60 p-5">
        <LogoUploader
          logoSrc={logoSrc}
          logoName={logoName}
          onLogoChange={(src, name) => {
            setLogoSrc(src);
            setLogoName(name);
          }}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ProductCard
          title="Support smartphone de table"
          description="Socle en impression 3D avec logo imprimé en couleur sur la face avant."
          zone="Impression couleur · face avant"
        >
          <PhoneStandMockup logoSrc={logoSrc} />
        </ProductCard>

        <ProductCard
          title="Set de table rigide gravé"
          description="Set de table rigide avec logo gravé au centre, effet bois brûlé."
          zone="Gravure laser · centre"
        >
          <PlacematMockup logoSrc={logoSrc} />
        </ProductCard>

        <ProductCard
          title="Présentoir menu du jour magnétique"
          description="Présentoir acrylique à fixation magnétique, logo imprimé en en-tête."
          zone="Impression couleur · bandeau haut"
        >
          <MenuDisplayMockup logoSrc={logoSrc} />
        </ProductCard>

        <ProductCard
          title="Porte-bouteille de vin personnalisé"
          description="Socle en impression 3D avec médaillon logo gravé — rendu 3D, faites-le pivoter."
          zone="Rendu 3D · médaillon gravé"
        >
          <WineBottleScene logoSrc={logoSrc} />
        </ProductCard>
      </section>
    </div>
  );
}
