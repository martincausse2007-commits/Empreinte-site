// Types partagés par toute l'application.
// Les jours sont numérotés de 0 (lundi) à 6 (dimanche).

/** Secteur d'activité choisi dans le questionnaire. */
export type ActivityId =
  | "restaurant"
  | "bar"
  | "boulangerie"
  | "boutique"
  | "supermarche"
  | "beaute"
  | "hotel"
  | "agence"
  | "autre";

/** Ancien nom, gardé pour compatibilité. */
export type BusinessType = ActivityId;

/** Façon dont les journées sont découpées en créneaux. */
export type Organisation = "coupure" | "continu" | "equipes" | "libre";

export type TimeRange = { start: string; end: string };

/** Horaires d'ouverture : pour chaque jour (0 = lundi), 0, 1 ou 2 plages. */
export type OpeningHours = TimeRange[][];

/** Règles de planification réglées par le gérant. */
export type Rules = {
  restDaysPerWeek: number; // 1 ou 2
  consecutiveRestDays: boolean;
  minRestHours: number; // repos minimum entre deux journées (11 h en France)
  maxHoursPerDay: number;
  maxAmplitudeHours: number; // entre le début et la fin de la journée
  splitShifts: "never" | "limited" | "often";
  maxSplitsPerWeek: number;
  overtimeHours: number; // heures possibles au-delà du contrat
  weekendFairness: boolean;
  /** Délai de prévenance (modification d'un planning publié). Réglable : à vérifier avec votre comptable. */
  noticePartTimeDays?: number; // jours ouvrés, salariés à temps partiel (Code du travail : 7, accord : 3 minimum)
  noticeFullTimeDays?: number; // jours, salariés à temps plein (pas de chiffre légal général : valeur de l'établissement)
  /** Objectif de masse salariale en % du chiffre d'affaires prévu. */
  laborTargetPercent?: number;
  /** Charges patronales estimées, en % du brut (0 = coût brut). */
  employerChargesPercent?: number;
};

export type Post = {
  id: string;
  name: string;
  color: PostColor;
};

// Couleurs des postes. Pas de rouge, orange, ambre ni vert :
// ces teintes sont réservées aux alertes et au terracotta de la marque.
export type PostColor = "blue" | "teal" | "violet" | "pink" | "indigo" | "cyan" | "fuchsia" | "sky" | "slate";

export type Service = {
  id: string;
  name: string;
  start: string; // "11:00"
  end: string; // "15:00" ("00:00" = minuit)
  /** Pause non payée comprise dans le créneau (minutes). */
  breakMinutes?: number;
  /** Horaires différents certains jours (clé = jour). */
  overrides?: Record<number, TimeRange>;
  /** Jours où ce créneau existe (tous si absent). */
  days?: number[];
};

export type Unavailability = {
  day: number;
  serviceId: string | "all";
};

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  /** Postes que la personne sait tenir. Le premier est son poste principal. */
  postIds: string[];
  contractHours: number;
  unavailability: Unavailability[];
  /** Week-ends travaillés sur les 4 dernières semaines (pour l'équité). */
  weekendHistory: number;
  /** Taux horaire brut, facultatif, visible seulement par le gérant (coût estimé). */
  hourlyRate?: number;
  /** Salarié supprimé : nom effacé, seul l'historique anonymisé est gardé. */
  archived?: boolean;
  prefs?: EmployeePrefs;
};

/** Préférences et limites horaires d'un salarié. */
export type EmployeePrefs = {
  /** Créneaux types préférés (souhait, respecté si possible). */
  preferredServices?: string[];
  /** Plages autorisées (obligatoire) : ex. du lundi au vendredi, pas avant 17h. */
  timeWindows?: { days: number[]; from?: string; to?: string; label?: string }[];
};

/** Types d'absence. Jamais de motif ni d'information médicale. */
export type AbsenceType = "cp" | "repos" | "absence" | "arret" | "formation";

export type Absence = {
  id: string;
  employeeId: string;
  type: AbsenceType;
  start: string; // "2026-12-21" (inclus)
  end: string; // "2026-12-27" (inclus)
};

/** Jours fériés : identifiant → ouvert (true) ou fermé (false). */
export type HolidayId = "jourdelan" | "paques" | "1mai" | "8mai" | "ascension" | "pentecote" | "14juillet" | "15aout" | "toussaint" | "11novembre" | "noel";

export type Shift = {
  id: string;
  employeeId: string;
  day: number;
  start: string;
  end: string;
  postId: string;
  breakMinutes?: number;
  /** Renfort ajouté pour atteindre les heures du contrat (au-delà des besoins). */
  extra?: boolean;
  /** Cadenas : « Régénérer » ne touche jamais à ce créneau. */
  locked?: boolean;
  /** Créé ou modifié à la main : gardé lors d'une régénération. */
  manual?: boolean;
  /** « Pourquoi lui ? » : raisons du choix fait par le générateur. */
  reason?: string[];
};

/** Suivi d'une semaine : publication, historique, verrous, chiffre d'affaires prévu. */
export type WeekMeta = {
  status: "draft" | "published";
  publishedAt?: string;
  /** Copie de la semaine telle que publiée (ce que voit l'équipe). */
  snapshot?: Shift[];
  /** Changements faits après publication. */
  changes?: { at: string; employeeId: string; text: string }[];
  /** Salariés dont toute la semaine est verrouillée. */
  lockedEmployees?: string[];
  /** Chiffre d'affaires prévu par jour (0 = lundi), saisi à la main. */
  revenue?: (number | null)[];
};

/** Demandes faites par l'équipe (simulées dans la démo, réelles en phase 2). */
export type TeamRequest = {
  id: string;
  employeeId: string;
  status: "pending" | "accepted" | "refused";
  createdAt: string;
} & (
  | { type: "leave"; absenceType: AbsenceType; start: string; end: string; note?: string }
  | { type: "swap"; week: string; shiftId: string; toEmployeeId: string }
  | { type: "availability"; unavailability: Unavailability[]; preferences?: EmployeePrefs; text: string }
);

/** Clé "jour|serviceId|postId" -> nombre de personnes nécessaires. */
export type Needs = Record<string, number>;

export type Template = {
  id: string;
  name: string;
  /** 1 semaine = semaine type ; 2 ou 4 = roulement. */
  weeks: Omit<Shift, "id">[][];
  createdAt: string;
};

export type Establishment = {
  name: string;
  type: ActivityId;
  organisation: Organisation;
  opening: OpeningHours;
  prepMinutes: number; // mise en place avant l'ouverture
  closeMinutes: number; // rangement après la fermeture
  /** Jours fériés où l'établissement est FERMÉ (les autres sont ouverts). */
  closedHolidays?: HolidayId[];
  /** Convention collective : numéro IDCC, ou "code" (Code du travail seul). */
  convention?: string;
};

export type AppState = {
  version: number;
  establishment: Establishment;
  rules: Rules;
  posts: Post[];
  services: Service[];
  employees: Employee[];
  needs: Needs;
  /** Planning par semaine, clé = date du lundi "2026-11-16". */
  plans: Record<string, Shift[]>;
  templates: Template[];
  absences: Absence[];
  /** Publication, historique, verrous et CA prévu, par semaine. */
  weekMeta?: Record<string, WeekMeta>;
  /** Demandes de l'équipe (congés, échanges, disponibilités). */
  requests?: TeamRequest[];
  currentWeek: string;
  shareToken: string;
};
