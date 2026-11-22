"use client";

// « Magasin » de données de la maquette : tout est gardé dans le navigateur
// (localStorage). À l'étape 2, ce fichier sera remplacé par Supabase.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AppState, Shift } from "./types";
import { createDemoState, STATE_VERSION } from "./demo-data";

const KEY = "planning-demo-state";

type Ctx = {
  state: AppState;
  ready: boolean;
  /** `record: true` = la modification des plannings peut être annulée. */
  update: (fn: (s: AppState) => AppState, opts?: { record?: boolean }) => void;
  /** Modifie les créneaux d'une semaine (toujours annulable). */
  setShifts: (week: string, fn: (shifts: Shift[]) => Shift[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  reset: () => void;
  replace: (s: AppState) => void;
};

const AppContext = createContext<Ctx | null>(null);

function load(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== STATE_VERSION) return null;
    return { ...parsed, absences: parsed.absences ?? [] }; // données enregistrées avant l'ajout des absences
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

  // ---- Annuler / rétablir (sur les plannings uniquement, 50 étapes) ----------
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  const past = useRef<AppState["plans"][]>([]);
  const future = useRef<AppState["plans"][]>([]);
  const [, setTick] = useState(0);
  const remember = useCallback(() => {
    past.current.push(stateRef.current.plans);
    if (past.current.length > 50) past.current.shift();
    future.current = [];
    setTick((t) => t + 1);
  }, []);
  const clearHistory = useCallback(() => {
    past.current = [];
    future.current = [];
    setTick((t) => t + 1);
  }, []);

  const update = useCallback(
    (fn: (s: AppState) => AppState, opts?: { record?: boolean }) => {
      if (opts?.record) remember();
      setState(fn);
    },
    [remember],
  );
  const setShifts = useCallback(
    (week: string, fn: (shifts: Shift[]) => Shift[]) => {
      remember();
      setState((s) => ({ ...s, plans: { ...s.plans, [week]: fn(s.plans[week] ?? []) } }));
    },
    [remember],
  );
  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(stateRef.current.plans);
    setState((s) => ({ ...s, plans: prev }));
    setTick((t) => t + 1);
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(stateRef.current.plans);
    setState((s) => ({ ...s, plans: next }));
    setTick((t) => t + 1);
  }, []);
  const reset = useCallback(() => {
    clearHistory();
    setState(createDemoState());
  }, [clearHistory]);
  const replace = useCallback(
    (s: AppState) => {
      clearHistory();
      setState(s);
    },
    [clearHistory],
  );

  return (
    <AppContext.Provider
      // eslint-disable-next-line react-hooks/refs -- les piles sont relues à chaque changement grâce à setTick
      value={{ state, ready, update, setShifts, reset, replace, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp doit être utilisé dans <AppProvider>");
  return ctx;
}

let n = 0;
export const uid = (prefix = "id") => `${prefix}${Date.now().toString(36)}${(n++).toString(36)}`;
