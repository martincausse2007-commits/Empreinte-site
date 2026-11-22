// Exports pour le comptable (CSV et Excel) et export complet des données.

import { zipSync, strToU8 } from "fflate";
import type { AppState } from "./types";
import { ABSENCE_TYPES } from "./absences";
import { MONTHS_FR, monthCounters } from "./counters";

export type Cell = string | number;
export type Sheet = { name: string; rows: Cell[][] };

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Tableau mensuel par salarié : heures, heures sup estimées, absences, coût. */
export function monthSheet(state: AppState, year: number, month: number): Sheet {
  const counters = monthCounters(state, year, month);
  const hasCost = counters.some((c) => c.cost !== undefined);
  const header: Cell[] = [
    "Salarié",
    "Contrat hebdo (h)",
    "Contrat du mois (h, mensualisé)",
    "Heures à planifier (h)",
    "Heures planifiées (h)",
    "Écart (h)",
    "Heures sup / complémentaires estimées (h)",
    "Dimanches travaillés",
    "Jours fériés travaillés",
    ...Object.values(ABSENCE_TYPES).map((t) => `${t.label} (jours)`),
    ...(hasCost ? ["Taux horaire brut (€)", "Coût brut estimé (€)"] : []),
  ];
  const rows: Cell[][] = counters.map((c) => [
    `${c.employee.firstName} ${c.employee.lastName}`.trim(),
    c.employee.contractHours,
    r2(c.contract),
    r2(c.expected),
    r2(c.planned),
    r2(c.planned - c.expected),
    r2(c.extra),
    c.sundays,
    c.holidays,
    ...(Object.keys(ABSENCE_TYPES) as (keyof typeof ABSENCE_TYPES)[]).map((k) => c.absences[k]),
    ...(hasCost ? [c.employee.hourlyRate ?? "", c.cost ?? ""] : []),
  ]);
  const title = `${state.establishment.name} — ${MONTHS_FR[month]} ${year}`;
  return {
    name: `${MONTHS_FR[month]} ${year}`,
    rows: [[title], ["Estimation indicative à partir du planning : à vérifier avant la paie."], [], header, ...rows],
  };
}

/** CSV au format attendu par Excel en français : « ; » et virgule décimale, avec BOM UTF-8. */
export function toCSV(sheet: Sheet): string {
  const esc = (v: Cell) => {
    const s = typeof v === "number" ? String(v).replace(".", ",") : v;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + sheet.rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const col = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/** Fichier Excel (.xlsx) minimal, sans bibliothèque externe lourde. */
export function toXlsx(sheet: Sheet): Uint8Array {
  const rows = sheet.rows
    .map((r, i) => {
      const cells = r
        .map((v, j) => {
          const ref = `${col(j)}${i + 1}`;
          if (v === "") return "";
          if (typeof v === "number") return `<c r="${ref}"><v>${v}</v></c>`;
          return `<c r="${ref}" t="inlineStr"${i === 3 ? ' s="1"' : ""}><is><t>${xml(v)}</t></is></c>`;
        })
        .join("");
      return `<row r="${i + 1}">${cells}</row>`;
    })
    .join("");
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
    ),
    "_rels/.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheet.name.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    ),
    "xl/styles.xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    ),
    "xl/worksheets/sheet1.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="24" customWidth="1"/><col min="2" max="20" width="16" customWidth="1"/></cols><sheetData>${rows}</sheetData></worksheet>`,
    ),
  };
  return zipSync(files);
}

/** Toutes les données de l'établissement, lisibles (JSON). */
export function exportAll(state: AppState): string {
  return JSON.stringify({ exportéLe: new Date().toISOString(), application: "Quinzo", données: state }, null, 2);
}

/** Déclenche le téléchargement d'un fichier dans le navigateur. */
export function download(filename: string, data: string | Uint8Array, mime: string) {
  const blob = new Blob([typeof data === "string" ? data : (data as BlobPart)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
