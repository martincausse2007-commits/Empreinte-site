// Conventions collectives : choisir la sienne ajuste les règles de planning.
//
// IMPORTANT : seules les limites dont nous sommes sûrs sont appliquées
// automatiquement. Le reste (temps partiel, coupures, dimanche, majorations…)
// est signalé « à vérifier ». Ce n'est pas un conseil juridique.

import type { ActivityId, Rules } from "./types";

export type Convention = {
  /** Numéro IDCC (identifiant officiel), ou "code" = Code du travail seul. */
  idcc: string;
  label: string;
  activities: ActivityId[];
  /** Réglages appliqués quand on choisit cette convention. */
  rules: Partial<Rules>;
  /** Ce que Quinzo applique, en clair. */
  applied: string[];
  /** Ce qu'il faut vérifier soi-même dans le texte de la convention. */
  toCheck: string[];
};

const CODE_RULES: Partial<Rules> = { maxHoursPerDay: 10, maxAmplitudeHours: 13, minRestHours: 11 };
const CODE_APPLIED = [
  "10 h de travail maximum par jour",
  "11 h de repos entre deux journées et 35 h de repos d'affilée par semaine",
  "48 h maximum sur une semaine",
  "20 min de pause dès 6 h de travail",
];
const COMMON_CHECK = ["Règles du temps partiel (coupures, heures complémentaires)", "Travail du dimanche et des jours fériés, majorations"];

export const CONVENTIONS: Convention[] = [
  {
    idcc: "code",
    label: "Aucune / je ne sais pas (Code du travail)",
    activities: [],
    rules: CODE_RULES,
    applied: CODE_APPLIED,
    toCheck: ["Votre convention collective figure sur les bulletins de paie : choisissez-la dès que possible."],
  },
  {
    idcc: "1979",
    label: "Hôtels, cafés, restaurants (HCR)",
    activities: ["restaurant", "bar", "hotel"],
    rules: { maxHoursPerDay: 11, maxAmplitudeHours: 13, restDaysPerWeek: 2, minRestHours: 11 },
    applied: [
      "11 h de travail maximum par jour (limite des cuisiniers, appliquée à tous par prudence)",
      "Amplitude de 13 h maximum entre le début et la fin de la journée",
      "2 jours de repos par semaine",
      "11 h de repos entre deux journées, 48 h maximum par semaine",
    ],
    toCheck: [
      "Durée maximale de 11 h 30 pour le personnel de salle et 12 h pour les veilleurs de nuit et la réception : vous pouvez monter la limite par jour si votre équipe le permet",
      ...COMMON_CHECK,
    ],
  },
  {
    idcc: "1501",
    label: "Restauration rapide",
    activities: ["restaurant"],
    rules: CODE_RULES,
    applied: CODE_APPLIED,
    toCheck: ["Nombre et durée des coupures autorisées", ...COMMON_CHECK],
  },
  {
    idcc: "843",
    label: "Boulangerie-pâtisserie (entreprises artisanales)",
    activities: ["boulangerie"],
    rules: CODE_RULES,
    applied: CODE_APPLIED,
    toCheck: ["Horaires de nuit pour la production", ...COMMON_CHECK],
  },
  {
    idcc: "1517",
    label: "Commerce de détail non alimentaire",
    activities: ["boutique"],
    rules: CODE_RULES,
    applied: CODE_APPLIED,
    toCheck: COMMON_CHECK,
  },
  {
    idcc: "2216",
    label: "Commerce de détail et de gros à prédominance alimentaire",
    activities: ["supermarche"],
    rules: CODE_RULES,
    applied: CODE_APPLIED,
    toCheck: COMMON_CHECK,
  },
  {
    idcc: "1505",
    label: "Commerce de détail alimentaire spécialisé (fruits et légumes, épicerie, produits laitiers)",
    activities: ["supermarche"],
    rules: CODE_RULES,
    applied: CODE_APPLIED,
    toCheck: COMMON_CHECK,
  },
  {
    idcc: "2596",
    label: "Coiffure",
    activities: ["beaute"],
    rules: CODE_RULES,
    applied: CODE_APPLIED,
    toCheck: COMMON_CHECK,
  },
  {
    idcc: "3032",
    label: "Esthétique-cosmétique",
    activities: ["beaute"],
    rules: CODE_RULES,
    applied: CODE_APPLIED,
    toCheck: COMMON_CHECK,
  },
  {
    idcc: "1527",
    label: "Immobilier",
    activities: ["agence"],
    rules: CODE_RULES,
    applied: CODE_APPLIED,
    toCheck: COMMON_CHECK,
  },
];

export const CONVENTION_LOOKUP_URL = "https://code.travail.gouv.fr/outils/convention-collective";

export function findConvention(idcc?: string): Convention | undefined {
  return CONVENTIONS.find((c) => c.idcc === (idcc ?? "code"));
}

/** Convention proposée par défaut pour une activité. */
export function suggestedConvention(activity: ActivityId): string {
  return CONVENTIONS.find((c) => c.activities.includes(activity))?.idcc ?? "code";
}
