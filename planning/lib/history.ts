"use client";

// Navigation « comme une appli » :
// - chaque fenêtre ouverte ajoute une entrée dans l'historique du navigateur,
//   donc le bouton retour du téléphone ferme d'abord la fenêtre ;
// - Échap ferme la fenêtre du dessus ;
// - le bouton « ← Retour » revient à l'écran précédent de l'appli, ou à un
//   écran par défaut si on est arrivé directement sur la page.

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Layer = { id: string; close: () => void };
const layers: Layer[] = [];
let ignoreNextPop = false;
let listening = false;

function onPop() {
  if (ignoreNextPop) {
    ignoreNextPop = false;
    return;
  }
  const top = layers[layers.length - 1];
  if (top) top.close();
}

function onKey(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  const top = layers[layers.length - 1];
  if (top) {
    e.preventDefault();
    top.close();
  }
}

function ensureListening() {
  if (listening || typeof window === "undefined") return;
  window.addEventListener("popstate", onPop);
  window.addEventListener("keydown", onKey);
  listening = true;
}

/** À appeler par toute fenêtre / menu ouvert : retour et Échap la ferment. */
export function useHistoryLayer(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    ensureListening();
    const id = Math.random().toString(36).slice(2);
    const url = location.href;
    history.pushState({ ...(history.state ?? {}), __layer: id }, "");
    let closedByBack = false;
    const layer: Layer = {
      id,
      close: () => {
        closedByBack = true;
        closeRef.current();
      },
    };
    layers.push(layer);
    return () => {
      const i = layers.indexOf(layer);
      if (i >= 0) layers.splice(i, 1);
      // Fermée par un bouton de la fenêtre : on retire l'entrée d'historique
      // (sauf si l'utilisateur a entre-temps changé de page).
      if (!closedByBack && history.state?.__layer === id && location.href === url) {
        ignoreNextPop = true;
        history.back();
      }
    };
  }, [open]);
}

// ---- Bouton « Retour » ---------------------------------------------------------

const KEY = "quinzo-nav-depth";

/** Compte les écrans visités dans l'appli pendant cette session d'onglet. */
export function trackNavigation() {
  try {
    sessionStorage.setItem(KEY, String(Number(sessionStorage.getItem(KEY) ?? "0") + 1));
  } catch {
    /* stockage indisponible */
  }
}

function depth() {
  try {
    return Number(sessionStorage.getItem(KEY) ?? "0");
  } catch {
    return 0;
  }
}

/** Revient à l'écran précédent de l'appli, sinon à `fallback`. */
export function useBack(fallback: string) {
  const router = useRouter();
  return useCallback(() => {
    if (depth() > 1 && !history.state?.__layer) {
      try {
        sessionStorage.setItem(KEY, String(depth() - 2));
      } catch {
        /* ignore */
      }
      router.back();
    } else router.push(fallback);
  }, [router, fallback]);
}
