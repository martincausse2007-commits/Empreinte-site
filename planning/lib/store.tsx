"use client";

// « Magasin » de données de la maquette : tout est gardé dans le navigateur
// (localStorage). À l'étape 2, ce fichier sera remplacé par Supabase.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppState, Shift } from "./types";
import { createDemoState, STATE_VERSION } from "./demo-data";

const KEY = "planning-demo-state";

type Ctx = {
  state: AppState;
  ready: boolean;
  update: (fn: (s: AppState) => AppState) => void;
  setShifts: (week: string, fn: (shifts: Shift[]) => Shift[]) => void;
  reset: () => void;
  replace: (s: AppState) => void;
};

const AppContext = createContext<Ctx | null>(null);

function load(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    return parsed.version === STATE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDemoState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique du stockage local au démarrage
    if (saved) setState(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* stockage indisponible : la démo marche quand même */
    }
  }, [state, ready]);

  const update = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);
  const setShifts = useCallback(
    (week: string, fn: (shifts: Shift[]) => Shift[]) =>
      setState((s) => ({ ...s, plans: { ...s.plans, [week]: fn(s.plans[week] ?? []) } })),
    [],
  );
  const reset = useCallback(() => setState(createDemoState()), []);
  const replace = useCallback((s: AppState) => setState(s), []);

  return <AppContext.Provider value={{ state, ready, update, setShifts, reset, replace }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp doit être utilisé dans <AppProvider>");
  return ctx;
}

let n = 0;
export const uid = (prefix = "id") => `${prefix}${Date.now().toString(36)}${(n++).toString(36)}`;
