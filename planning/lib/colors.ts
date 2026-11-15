import type { PostColor } from "./types";

// Classes Tailwind écrites en entier pour que Tailwind les détecte.
export const POST_COLORS: Record<PostColor, { chip: string; dot: string; soft: string; ring: string }> = {
  blue: { chip: "bg-blue-50 text-blue-900 border-blue-200", dot: "bg-blue-500", soft: "bg-blue-100 text-blue-700", ring: "ring-blue-300" },
  orange: { chip: "bg-orange-50 text-orange-900 border-orange-200", dot: "bg-orange-500", soft: "bg-orange-100 text-orange-700", ring: "ring-orange-300" },
  violet: { chip: "bg-violet-50 text-violet-900 border-violet-200", dot: "bg-violet-500", soft: "bg-violet-100 text-violet-700", ring: "ring-violet-300" },
  emerald: { chip: "bg-emerald-50 text-emerald-900 border-emerald-200", dot: "bg-emerald-500", soft: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-300" },
  pink: { chip: "bg-pink-50 text-pink-900 border-pink-200", dot: "bg-pink-500", soft: "bg-pink-100 text-pink-700", ring: "ring-pink-300" },
  amber: { chip: "bg-amber-50 text-amber-900 border-amber-200", dot: "bg-amber-500", soft: "bg-amber-100 text-amber-700", ring: "ring-amber-300" },
  cyan: { chip: "bg-cyan-50 text-cyan-900 border-cyan-200", dot: "bg-cyan-500", soft: "bg-cyan-100 text-cyan-700", ring: "ring-cyan-300" },
  slate: { chip: "bg-slate-100 text-slate-900 border-slate-200", dot: "bg-slate-500", soft: "bg-slate-200 text-slate-700", ring: "ring-slate-300" },
};

export const COLOR_ORDER: PostColor[] = ["blue", "orange", "violet", "emerald", "pink", "amber", "cyan", "slate"];

const AVATAR = [
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-lime-100 text-lime-800",
  "bg-indigo-100 text-indigo-700",
  "bg-amber-100 text-amber-800",
  "bg-teal-100 text-teal-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-orange-100 text-orange-700",
];

export function avatarColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR[h % AVATAR.length];
}
