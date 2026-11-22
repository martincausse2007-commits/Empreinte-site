"use client";

// Choix de la convention collective : les règles s'ajustent automatiquement.

import { ExternalLink, Scale } from "lucide-react";
import { CONVENTIONS, CONVENTION_LOOKUP_URL, findConvention } from "@/lib/conventions";
import type { ActivityId, Rules } from "@/lib/types";
import { Field, inputClass } from "../ui";

export function ConventionPicker({
  value,
  activity,
  onChange,
}: {
  value?: string;
  activity: ActivityId;
  /** Nouvelle convention, et réglages à appliquer. */
  onChange: (idcc: string, rules: Partial<Rules>) => void;
}) {
  const known = findConvention(value);
  const selectValue = known ? known.idcc : "autre";
  const suggested = CONVENTIONS.filter((c) => c.activities.includes(activity));
  const others = CONVENTIONS.filter((c) => !c.activities.includes(activity) && c.idcc !== "code");
  const code = findConvention("code")!;
  const shown = known ?? code;

  return (
    <div className="space-y-3">
      <Field label="Votre convention collective" hint="Elle figure sur les bulletins de paie (numéro IDCC).">
        <select
          id="convention"
          className={inputClass}
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "autre") return onChange("", code.rules);
            const c = findConvention(v)!;
            onChange(c.idcc, c.rules);
          }}
        >
          {suggested.length > 0 && (
            <optgroup label="Pour votre activité">
              {suggested.map((c) => (
                <option key={c.idcc} value={c.idcc}>
                  {c.label} — IDCC {c.idcc}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Autres conventions">
            <option value="code">{code.label}</option>
            {others.map((c) => (
              <option key={c.idcc} value={c.idcc}>
                {c.label} — IDCC {c.idcc}
              </option>
            ))}
            <option value="autre">Autre convention (saisir le numéro)</option>
          </optgroup>
        </select>
      </Field>
      {!known && (
        <Field label="Numéro IDCC de votre convention" hint="4 chiffres, indiqué sur les bulletins de paie. Quinzo appliquera les règles du Code du travail.">
          <input
            className={inputClass}
            inputMode="numeric"
            maxLength={4}
            placeholder="Ex. 1486"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4), code.rules)}
          />
        </Field>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <Scale size={16} className="text-brand-700" /> Ce que Quinzo applique
        </div>
        <ul className="list-disc space-y-1 pl-5 text-slate-700">
          {shown.applied.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <div className="mt-3 mb-1 font-semibold">À vérifier dans votre convention</div>
        <ul className="list-disc space-y-1 pl-5 text-slate-700">
          {(known ? known.toCheck : ["Toutes les règles particulières de votre convention : temps partiel, coupures, dimanche, majorations."]).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <a href={CONVENTION_LOOKUP_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-brand-700 underline underline-offset-2">
          Retrouver votre convention sur le Code du travail numérique <ExternalLink size={14} />
        </a>
        <p className="mt-1 text-xs text-slate-600">Tous les réglages ci-dessous restent modifiables. Ce n&apos;est pas un conseil juridique.</p>
      </div>
    </div>
  );
}
