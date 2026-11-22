"use client";

// « Magasin » de données de l'application. Deux modes :
//  - Démo : pas de compte, données gardées dans ce navigateur (localStorage) ;
//  - Compte : données dans Supabase (base en Union européenne), enregistrées
//    automatiquement ; seules les modifications sont envoyées.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AppState, Shift } from "./types";
import { createDemoState, STATE_VERSION } from "./demo-data";
import { getSupabase } from "./supabase/client";
import { createEstablishmentFrom, loadEstablishment, myEstablishment, pushChanges } from "./cloud/sync";
import type { Rows } from "./cloud/mapping";
import { addWeeks, mondayOf } from "./time";

const KEY = "planning-demo-state";

export type Mode = "loading" | "demo" | "cloud";
export type SaveStatus = "saved" | "saving" | "error";

type Ctx = {
  state: AppState;
  ready: boolean;
  /** demo = sans compte ; cloud = connecté (données dans la base). */
  mode: Mode;
  /** Connecté mais pas encore d'établissement (questionnaire à faire). */
  needsSetup: boolean;
  userEmail: string | null;
  saveStatus: SaveStatus;
  signOut: () => Promise<void>;
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

/** Données de la démo gardées dans ce navigateur (pour les reprendre en créant un compte). */
export function localDemoData(): AppState | null {
  return load();
}
export const IMPORT_FLAG = "quinzo-import-demo";
const WEEK_KEY = "quinzo-current-week";

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDemoState());
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("loading");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const est = useRef<string | null>(null);
  const synced = useRef<Rows | null>(null);

  // Démarrage : connecté → on charge l'établissement depuis la base ; sinon → démo locale
  const boot = useCallback(async () => {
    const sb = getSupabase();
    const session = sb ? (await sb.auth.getSession()).data.session : null;
    if (!sb || !session) {
      est.current = null;
      synced.current = null;
      const saved = load();
      if (saved) setState(saved);
      setUserEmail(null);
      setNeedsSetup(false);
      setMode("demo");
      setReady(true);
      return;
    }
    setUserEmail(session.user.email ?? null);
    try {
      let id = await myEstablishment(sb);
      // Inscription depuis la démo : on reprend les données de la démo
      if (!id && localStorage.getItem(IMPORT_FLAG)) {
        const demo = load();
        if (demo) {
          const created = await createEstablishmentFrom(sb, demo);
          id = created.est;
        }
        localStorage.removeItem(IMPORT_FLAG);
      }
      if (!id) {
        est.current = null;
        setNeedsSetup(true);
        setMode("cloud");
        setReady(true);
        return;
      }
      let week = localStorage.getItem(WEEK_KEY) ?? undefined;
      if (!week) week = addWeeks(mondayOf(new Date()), 1);
      const { state: loaded, rows } = await loadEstablishment(sb, id, week);
      est.current = id;
      synced.current = rows;
      setState(loaded);
      setNeedsSetup(false);
      setMode("cloud");
      setReady(true);
    } catch {
      setSaveStatus("error");
      setMode("cloud");
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des données
    void boot();
    const sb = getSupabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void boot();
    });
    return () => data.subscription.unsubscribe();
  }, [boot]);

  // Enregistrement : démo → navigateur ; compte → base (après 0,7 s sans modification)
  useEffect(() => {
    if (!ready || mode === "loading") return;
    if (mode === "demo") {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch {
        /* stockage indisponible : la démo marche quand même */
      }
      return;
    }
    try {
      localStorage.setItem(WEEK_KEY, state.currentWeek);
    } catch {
      /* ignore */
    }
    const sb = getSupabase();
    if (!sb || !est.current) return;
    setSaveStatus("saving");
    const id = est.current;
    const timer = setTimeout(async () => {
      try {
        synced.current = await pushChanges(sb, id, synced.current, state);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [state, ready, mode]);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
    est.current = null;
    synced.current = null;
    try {
      localStorage.removeItem(WEEK_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // ---- Annuler / rétablir (sur les plannings uniquement, 50 étapes) ----------
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  const past = useRef<AppState["plans"][]>([]);
  const future = useRef<AppState["plans"][]>([]);
  // Nombre d'étapes à annuler / rétablir (copie des piles, lisible pendant l'affichage)
  const [hist, setHist] = useState({ undo: 0, redo: 0 });
  const refresh = useCallback(() => setHist({ undo: past.current.length, redo: future.current.length }), []);
  const remember = useCallback(() => {
    past.current.push(stateRef.current.plans);
    if (past.current.length > 50) past.current.shift();
    future.current = [];
    refresh();
  }, [refresh]);
  const clearHistory = useCallback(() => {
    past.current = [];
    future.current = [];
    refresh();
  }, [refresh]);

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
    refresh();
  }, [refresh]);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(stateRef.current.plans);
    setState((s) => ({ ...s, plans: next }));
    refresh();
  }, [refresh]);
  const reset = useCallback(() => {
    clearHistory();
    setState(createDemoState());
  }, [clearHistory]);
  const replace = useCallback(
    (s: AppState) => {
      clearHistory();
      setState(s);
      // Connecté sans établissement (fin du questionnaire) : on le crée dans la base
      const sb = getSupabase();
      if (mode === "cloud" && sb && !est.current) {
        setSaveStatus("saving");
        createEstablishmentFrom(sb, s)
          .then(({ est: id, rows }) => {
            est.current = id;
            synced.current = rows;
            setNeedsSetup(false);
            setSaveStatus("saved");
          })
          .catch(() => setSaveStatus("error"));
      }
    },
    [clearHistory, mode],
  );

  return (
    <AppContext.Provider
      value={{
        state,
        ready,
        mode,
        needsSetup,
        userEmail,
        saveStatus,
        signOut,
        update,
        setShifts,
        reset,
        replace,
        undo,
        redo,
        canUndo: hist.undo > 0,
        canRedo: hist.redo > 0,
      }}
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
