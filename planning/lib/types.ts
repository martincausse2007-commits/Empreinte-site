// Types partagés par toute l'application.
// Les jours sont numérotés de 0 (lundi) à 6 (dimanche).

export type BusinessType = "restaurant" | "boutique";

export type Post = {
  id: string;
  name: string;
  color: PostColor;
};

export type PostColor =
  | "blue"
  | "orange"
  | "violet"
  | "emerald"
  | "pink"
  | "amber"
  | "cyan"
  | "slate";

export type Service = {
  id: string;
  name: string;
  start: string; // "11:00"
  end: string; // "15:00" ("00:00" = minuit)
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
};

export type Shift = {
  id: string;
  employeeId: string;
  day: number;
  start: string;
  end: string;
  postId: string;
};

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
  type: BusinessType;
};

export type AppState = {
  version: number;
  establishment: Establishment;
  posts: Post[];
  services: Service[];
  employees: Employee[];
  needs: Needs;
  /** Planning par semaine, clé = date du lundi "2026-11-16". */
  plans: Record<string, Shift[]>;
  templates: Template[];
  currentWeek: string;
  shareToken: string;
};
