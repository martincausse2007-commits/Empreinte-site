# Empreinte — Configurateur de démonstration

Démo Next.js + Tailwind pour un site vitrine de produits d'impression 3D
personnalisés pour restaurants. On importe le logo d'un restaurant et il
est appliqué automatiquement sur des mockups de plusieurs produits pour
montrer visuellement l'identité de marque appliquée à la vaisselle.

## Structure du site

Page unique (`app/page.tsx`) composée des sections de `components/site/` :
en-tête avec menu mobile, accueil, produits + configurateur
(`components/Configurator.tsx`), fonctionnement, atouts, FAQ, formulaire de
contact et pied de page. Les coordonnées (nom, e-mail…) sont centralisées dans
`lib/site.ts` — **remplacez l'adresse e-mail d'exemple avant la mise en ligne**.
Le formulaire de contact n'a pas de backend : il ouvre la messagerie du
visiteur avec la demande pré-remplie (`mailto:`).

## Produits illustrés

- Support smartphone de table (logo imprimé en couleur, face avant)
- Set de table rigide (logo gravé au centre, effet bois brûlé)
- Présentoir menu du jour magnétique (logo imprimé en bandeau haut)
- Porte-bouteille de vin personnalisé (logo imprimé sur médaillon)

Les mockups sont des illustrations vectorielles (SVG) générées côté client :
aucune photo produit n'est nécessaire pour la démo.

## Fonctionnement du configurateur

- Le logo est importé par glisser-déposer ou sélection de fichier
  (`components/LogoUploader.tsx`), converti en data URL côté client via
  `FileReader`. Il n'est jamais envoyé à un serveur.
- Un bouton « Logo de démo » charge un emblème neutre généré en local
  (`lib/sampleLogo.ts`) pour tester le rendu sans fichier sous la main.
  Pour tester avec un logo réel et facilement reconnaissable (par exemple
  celui de Nike), glissez-déposez simplement votre propre fichier image :
  il reste local à votre navigateur et n'est pas commité dans ce dépôt.
- Chaque produit (`components/mockups/*.tsx`) réutilise un composant
  `LogoPlaque` (`components/mockups/LogoPlaque.tsx`) qui découpe le logo
  dans la zone d'application du produit, avec un effet "impression couleur"
  ou "gravure" (niveaux de gris + fusion `multiply`) selon le produit.

## Démarrer

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com)
