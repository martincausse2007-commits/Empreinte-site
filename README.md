# Empreinte — Configurateur de démonstration

Démo Next.js + Tailwind pour un site vitrine de produits d'impression 3D
personnalisés pour restaurants. On importe le logo d'un restaurant et il
est appliqué automatiquement sur des mockups de plusieurs produits pour
montrer visuellement l'identité de marque appliquée à la vaisselle.

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
