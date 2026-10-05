"use client";

import { useState } from "react";
import { site } from "@/lib/site";

const products = [
  "Support smartphone de table",
  "Set de table rigide gravé",
  "Présentoir menu du jour magnétique",
  "Porte-bouteille de vin personnalisé",
  "Autre / sur mesure",
];

export function Contact() {
  const [selected, setSelected] = useState<string[]>([]);

  // Pas de backend : le formulaire prépare un e-mail dans le logiciel de messagerie du visiteur.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = [
      `Nom : ${data.get("name")}`,
      `Restaurant : ${data.get("restaurant")}`,
      `E-mail : ${data.get("email")}`,
      `Produits : ${selected.join(", ") || "—"}`,
      `Quantité estimée : ${data.get("quantity") || "—"}`,
      "",
      String(data.get("message") || ""),
    ].join("\n");
    const subject = `Demande de devis — ${data.get("restaurant")}`;
    window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const field =
    "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20";

  return (
    <section id="contact" className="scroll-mt-20 bg-stone-900 text-stone-100">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-300">Contact</p>
          <h2 className="font-display text-3xl tracking-tight sm:text-4xl">
            Parlons de votre projet
          </h2>
          <p className="leading-relaxed text-stone-300">
            Dites-nous quels produits vous intéressent et pour combien de couverts :
            nous revenons vers vous avec une maquette et un devis détaillé.
          </p>
          <p className="pt-4 text-sm text-stone-400">
            Ou écrivez-nous directement à{" "}
            <a href={`mailto:${site.email}`} className="text-amber-300 underline underline-offset-4">
              {site.email}
            </a>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl bg-stone-50 p-6 text-stone-900 sm:grid-cols-2 sm:p-8">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Nom
            <input name="name" required autoComplete="name" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Restaurant
            <input name="restaurant" required autoComplete="organization" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            E-mail
            <input name="email" type="email" required autoComplete="email" className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Quantité estimée
            <input name="quantity" inputMode="numeric" placeholder="ex. 40 pièces" className={field} />
          </label>

          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">Produits souhaités</legend>
            <div className="flex flex-wrap gap-2">
              {products.map((p) => {
                const active = selected.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setSelected((s) => (active ? s.filter((x) => x !== p) : [...s, p]))
                    }
                    className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                      active
                        ? "border-stone-900 bg-stone-900 text-stone-50"
                        : "border-stone-300 bg-white text-stone-700 hover:border-stone-900"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
            Message
            <textarea name="message" rows={4} className={field} placeholder="Votre projet, vos délais, vos questions…" />
          </label>

          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-stone-500">
              Le bouton ouvre votre messagerie avec la demande pré-remplie.
            </p>
            <button
              type="submit"
              className="rounded-full bg-amber-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-800"
            >
              Envoyer la demande
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
