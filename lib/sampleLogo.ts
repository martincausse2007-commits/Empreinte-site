/**
 * Logo de démonstration neutre (aucune marque réelle) utilisé pour montrer
 * rapidement le configurateur sans avoir à téléverser un fichier.
 * Un vrai logo de restaurant (le vôtre, ou n'importe quel logo pour tester
 * — par exemple celui d'une grande marque) peut être glissé-déposé dans
 * l'outil : il reste uniquement dans votre navigateur, il n'est jamais
 * envoyé ni stocké sur un serveur.
 */
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="94" fill="#1c1917" />
  <circle cx="100" cy="100" r="94" fill="none" stroke="#d6b370" stroke-width="4" />
  <path d="M100 46c-27 0-46 21-46 46 0 30 30 50 46 62 16-12 46-32 46-62 0-25-19-46-46-46z" fill="none" stroke="#d6b370" stroke-width="5" stroke-linejoin="round" />
  <path d="M78 104l16 16 28-32" fill="none" stroke="#d6b370" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
  <text x="100" y="168" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="19" letter-spacing="3" fill="#d6b370">MAISON</text>
</svg>
`.trim();

export const sampleLogoDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const sampleLogoLabel = "logo-demo-maison.svg";
