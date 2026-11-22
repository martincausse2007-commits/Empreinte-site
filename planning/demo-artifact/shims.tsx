// Remplace les outils de navigation de Next.js par une navigation "#page",
// pour faire tourner la maquette dans une seule page HTML (version de test).
// Seuls les noms simples sont permis après le # : on encode donc
// /equipe/e3 en #fiche-e3 et /configuration?etape=3 en #configuration-3.
import { useSyncExternalStore, type AnchorHTMLAttributes } from "react";

const ROUTES: Record<string, string> = {
  "": "/",
  accueil: "/",
  connexion: "/connexion",
  inscription: "/inscription",
  configuration: "/configuration",
  planning: "/planning",
  equipe: "/equipe",
  besoins: "/besoins",
  modeles: "/modeles",
  partage: "/partage",
  reglages: "/reglages",
  "lien-equipe": "/p/demo",
};

export function toHash(path: string) {
  const [p, query] = path.split("?");
  if (p.startsWith("/p/")) return "#lien-equipe";
  const fiche = p.match(/^\/equipe\/(.+)$/);
  if (fiche) return `#fiche-${fiche[1]}`;
  const etape = new URLSearchParams(query ?? "").get("etape");
  if (p === "/configuration" && etape) return `#configuration-${etape}`;
  const name = p.replace(/^\//, "");
  return name ? `#${name}` : "#accueil";
}

function parse(): { path: string; search: string } {
  const h = typeof location === "undefined" ? "" : location.hash.replace(/^#/, "");
  const fiche = h.match(/^fiche-(.+)$/);
  if (fiche) return { path: `/equipe/${fiche[1]}`, search: "" };
  const etape = h.match(/^configuration-(\d+)$/);
  if (etape) return { path: "/configuration", search: `etape=${etape[1]}` };
  return { path: ROUTES[h] ?? "/", search: "" };
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
  };
}

const currentHash = () => (typeof location === "undefined" ? "" : location.hash);

export function usePathname() {
  useSyncExternalStore(subscribe, currentHash, () => "");
  return parse().path;
}

export function useSearchParams() {
  useSyncExternalStore(subscribe, currentHash, () => "");
  return new URLSearchParams(parse().search);
}

export function useRouter() {
  return {
    push: (p: string) => (location.hash = toHash(p)),
    replace: (p: string) => location.replace(toHash(p)),
    back: () => history.back(),
  };
}

export default function Link({ href, target: _t, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  void _t;
  return <a href={toHash(href)} {...rest} />;
}
