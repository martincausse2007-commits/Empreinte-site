// Remplace les outils de navigation de Next.js par une navigation "#page",
// pour faire tourner la maquette dans une seule page HTML (version de test).
import { useSyncExternalStore, type AnchorHTMLAttributes } from "react";

const ROUTES: Record<string, string> = {
  "": "/",
  accueil: "/",
  connexion: "/connexion",
  inscription: "/inscription",
  planning: "/planning",
  equipe: "/equipe",
  besoins: "/besoins",
  modeles: "/modeles",
  partage: "/partage",
  reglages: "/reglages",
  "lien-equipe": "/p/demo",
};

export function toHash(path: string) {
  if (path.startsWith("/p/")) return "#lien-equipe";
  const name = path.replace(/^\//, "");
  return name ? `#${name}` : "#accueil";
}

function current() {
  const h = typeof location === "undefined" ? "" : location.hash.replace(/^#/, "");
  return ROUTES[h] ?? "/";
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function usePathname() {
  return useSyncExternalStore(subscribe, current, () => "/");
}

export function useRouter() {
  return { push: (p: string) => (location.hash = toHash(p)), replace: (p: string) => (location.hash = toHash(p)) };
}

export default function Link({ href, target: _t, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  void _t;
  return <a href={toHash(href)} {...rest} />;
}
