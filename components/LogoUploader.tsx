"use client";

import { useCallback, useId, useRef, useState } from "react";
import { sampleLogoDataUrl, sampleLogoLabel } from "@/lib/sampleLogo";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

type Props = {
  logoSrc: string | null;
  logoName: string | null;
  onLogoChange: (dataUrl: string | null, name: string | null) => void;
};

export function LogoUploader({ logoSrc, logoName, onLogoChange }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Ce fichier n'est pas une image (PNG, JPG ou SVG attendu).");
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError("Le fichier dépasse 5 Mo.");
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = () => {
        onLogoChange(reader.result as string, file.name);
      };
      reader.readAsDataURL(file);
    },
    [onLogoChange],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) readFile(file);
    },
    [readFile],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-1 cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-5 py-4 transition-colors ${
          isDragging
            ? "border-amber-500 bg-amber-50"
            : "border-stone-300 bg-white hover:border-stone-400"
        }`}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt="Aperçu du logo importé"
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <span className="text-2xl text-stone-300">+</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-800">
            {logoSrc ? "Logo chargé" : "Glissez-déposez un logo, ou cliquez pour parcourir"}
          </p>
          <p className="truncate text-xs text-stone-500">
            {logoName ?? "PNG, JPG ou SVG · 5 Mo max · reste dans votre navigateur"}
          </p>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) readFile(file);
            event.target.value = "";
          }}
        />
      </label>

      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => onLogoChange(sampleLogoDataUrl, sampleLogoLabel)}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
        >
          Logo de démo
        </button>
        <button
          type="button"
          onClick={() => {
            onLogoChange(null, null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          disabled={!logoSrc}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Retirer
        </button>
      </div>

      {error && <p className="text-sm text-red-600 sm:basis-full">{error}</p>}
    </div>
  );
}
