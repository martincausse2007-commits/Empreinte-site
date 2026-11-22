// Vérifie l'identité visuelle : contrastes suffisants, aucune couleur en dur,
// et pas de couleur d'alerte utilisée pour décorer.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR_ORDER } from "@/lib/colors";

const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
const token = (name: string) => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`Couleur --color-${name} introuvable`);
  return m[1];
};

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

describe("Palette terracotta", () => {
  it("utilise exactement les couleurs demandées", () => {
    expect(token("brand-50").toLowerCase()).toBe("#fbede7");
    expect(token("brand-100").toLowerCase()).toBe("#f5ddd3");
    expect(token("brand-600").toLowerCase()).toBe("#b4442a");
    expect(token("brand-700").toLowerCase()).toBe("#963722");
    expect(token("brand-900").toLowerCase()).toBe("#6e2615");
    expect(token("ink").toLowerCase()).toBe("#2f3e46");
    expect(token("page").toLowerCase()).toBe("#fbf6f1");
  });

  const pairs: [string, string, string][] = [
    ["#ffffff", "brand-600", "texte blanc sur bouton principal"],
    ["#ffffff", "brand-700", "texte blanc sur bouton survolé"],
    ["brand-700", "brand-50", "lien sur fond terracotta clair"],
    ["brand-900", "brand-50", "texte sur fond terracotta clair"],
    ["ink", "page", "titres sur le fond de page"],
    ["slate-500", "page", "texte secondaire sur le fond de page"],
    ["slate-500", "#ffffff", "texte secondaire sur carte blanche"],
    ["slate-500", "slate-50", "texte secondaire sur gris très clair"],
    ["slate-600", "slate-100", "texte sur gris clair"],
    ["#ffffff", "whatsapp", "bouton WhatsApp"],
    ["#ffffff", "ink", "texte blanc sur le bandeau encre (accueil, barre latérale)"],
    ["brand-300", "ink", "accroche terracotta sur le bandeau encre"],
    ["brand-800", "#ffffff", "bouton blanc « Essayer maintenant »"],
  ];
  for (const [fg, bg, label] of pairs) {
    it(`contraste ≥ 4,5:1 : ${label}`, () => {
      const f = fg.startsWith("#") ? fg : token(fg);
      const b = bg.startsWith("#") ? bg : token(bg);
      expect(contrast(f, b)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) ? [p] : [];
  });
}
const sources = ["app", "components", "lib"].flatMap((d) => files(join(__dirname, "..", d))).filter((f) => !f.endsWith("globals.css"));

describe("Pas de couleur en dur ni de gris trop clair", () => {
  it("aucune couleur hexadécimale dans les composants", () => {
    const offenders = sources.filter((f) => /(bg|text|border|ring|fill|stroke)-\[#|["'`]#[0-9a-fA-F]{3,6}["'`]/.test(readFileSync(f, "utf8").replace(/themeColor:.*$/m, "")));
    expect(offenders).toEqual([]);
  });
  it("aucun texte en slate-300 / slate-400", () => {
    const offenders = sources.filter((f) => /\btext-slate-(300|400)\b/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("Couleurs des postes", () => {
  it("n'utilisent ni rouge, ni orange, ni ambre, ni vert (réservés aux alertes et à la marque)", () => {
    for (const c of COLOR_ORDER) expect(["red", "orange", "amber", "green", "emerald", "lime", "rose"]).not.toContain(c);
  });
});
