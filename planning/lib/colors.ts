import type { PostColor } from "./types";

// Classes Tailwind écrites en entier pour que Tailwind les détecte.
export const POST_COLORS: Record<PostColor, { chip: string; dot: string; soft: string; ring: string }> = {
  blue: { chip: "bg-blue-50 text-blue-900 border-blue-200", dot: "bg-blue-500", soft: "bg-blue-100 text-blue-800", ring: "ring-blue-300" },
  teal: { chip: "bg-teal-50 text-teal-900 border-teal-200", dot: "bg-teal-500", soft: "bg-teal-100 text-teal-800", ring: "ring-teal-300" },
  violet: { chip: "bg-violet-50 text-violet-900 border-violet-200", dot: "bg-violet-500", soft: "bg-violet-100 text-violet-800", ring: "ring-violet-300" },
  pink: { chip: "bg-pink-50 text-pink-900 border-pink-200", dot: "bg-pink-500", soft: "bg-pink-100 text-pink-800", ring: "ring-pink-300" },
  indigo: { chip: "bg-indigo-50 text-indigo-900 border-indigo-200", dot: "bg-indigo-500", soft: "bg-indigo-100 text-indigo-800", ring: "ring-indigo-300" },
  cyan: { chip: "bg-cyan-50 text-cyan-900 border-cyan-200", dot: "bg-cyan-600", soft: "bg-cyan-100 text-cyan-800", ring: "ring-cyan-300" },
  fuchsia: { chip: "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200", dot: "bg-fuchsia-500", soft: "bg-fuchsia-100 text-fuchsia-800", ring: "ring-fuchsia-300" },
  sky: { chip: "bg-sky-50 text-sky-900 border-sky-200", dot: "bg-sky-500", soft: "bg-sky-100 text-sky-800", ring: "ring-sky-300" },
  slate: { chip: "bg-slate-100 text-slate-900 border-slate-200", dot: "bg-slate-500", soft: "bg-slate-200 text-slate-800", ring: "ring-slate-300" },
};

// Anciennes couleurs (données enregistrées avant le changement d'identité)
const LEGACY: Record<string, PostColor> = { orange: "teal", emerald: "cyan", amber: "indigo" };
for (const [old, now] of Object.entries(LEGACY)) (POST_COLORS as Record<string, (typeof POST_COLORS)[PostColor]>)[old] = POST_COLORS[now];

export const COLOR_ORDER: PostColor[] = ["blue", "teal", "violet", "pink", "indigo", "cyan", "fuchsia", "sky", "slate"];

// Pastilles des avatars : teintes neutres, jamais rouge / ambre / vert (réservés aux alertes).
const AVATAR = [
  "bg-sky-100 text-sky-800",
  "bg-indigo-100 text-indigo-800",
  "bg-teal-100 text-teal-800",
  "bg-violet-100 text-violet-800",
  "bg-pink-100 text-pink-800",
  "bg-cyan-100 text-cyan-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-blue-100 text-blue-800",
];

export function avatarColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR[h % AVATAR.length];
}
