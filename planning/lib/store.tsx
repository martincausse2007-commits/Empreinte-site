"use client";

// « Magasin » de données de l'application. Deux modes :
//  - Démo : pas de compte, données gardées dans ce navigateur (localStorage) ;
//  - Compte : données dans Supabase (base en Union européenne), enregistrées
//    automatiquement ; seules les modifications sont envoyées.
// Un gérant peut avoir PLUSIEURS établissements : un seul est « actif » à la fois.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AppState, Shift } from "./types";
import { createDemoState, STATE_VERSION } from "./demo-data";
import { createDemoStore } from "./demo-store";
import { getSupabase } from "./supabase/client";
import { createEstablishmentFrom, listEstablishments, loadEstablishment, loadTeamActivity, pushChanges } from "./cloud/sync";
import { toRows, type Rows } from "./cloud/mapping";
import { addWeeks, mondayOf } from "./time";
import { changeText, diffWeek } from "./publish";

const LEGACY_KEY = "planning-demo-state"; // ancienne démo (un seul établissement)
const KEY = "quinzo-demo-v2";
export const IMPORT_FLAG = "quinzo-import-demo";
const WEEK_KEY = "quinzo-current-week";
const ACTIVE_KEY = "quinzo-active-establishment";

export type Mode = "loading" | "demo" | "cloud";
export type SaveStatus = "saved" | "saving" | "error";
export type EstablishmentSummary = { id: string; name: string; type: AppState["establishment"]["type"]; role?: "owner" | "manager" };

/** Démo : tous les établissements du navigateur, et celui qui est ouvert. */
type DemoStore = { version: number; active: string; items: Record<string, AppState> };

type Ctx = {
  state: AppState;
  ready: boolean;
  /** demo = sans compte ; cloud = connecté (données dans la base). */
  mode: Mode;
  /** Connecté mais aucun établissement : questionnaire à faire. */
  needsSetup: boolean;
  /** Le compte connecté est relié à une fiche salarié (espace « /moi »). */
  isEmployee: boolean;
  userEmail: string | null;
  saveStatus: SaveStatus;
  signOut: () => Promise<void>;
  /** Tous les établissements du gérant, et celui qui est ouvert. */
  establishments: EstablishmentSummary[];
  activeId: string | null;
  switchTo: (id: string) => Promise<void>;
  /** Ajoute un établissement (fin du questionnaire « nouvel établissement ») et l'ouvre. */
  addEstablishment: (s: AppState) => Promise<void>;
  removeEstablishment: (id: string) => Promise<void>;
  /** Données d'un établissement de la démo (pour les cartes de la page d'accueil). */
  demoItem: (id: string) => AppState | undefined;
  /** `record: true` = la modification des plannings peut être annulée. */
  update: (fn: (s: AppState) => AppState, opts?: { record?: boolean }) => void;
  /** Modifie les créneaux d'une semaine (toujours annulable). */
  setShifts: (week: string, fn: (shifts: Shift[]) => Shift[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Démo : remet les établissements d'exemple. */
  reset: () => void;
  /** Remplace l'établissement ouvert (ex. « refaire le questionnaire »). */
  replace: (s: AppState) => void;
};

const AppContext = createContext<Ctx | null>(null);

let n = 0;
export const uid = (prefix = "id") => `${prefix}${Date.now().toString(36)}${(n++).toString(36)}`;

const normalize = (s: AppState): AppState => ({ ...s, absences: s.absences ?? [] });

function loadDemo(): DemoStore | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as DemoStore;
      if (d.version === STATE_VERSION && d.items?.[d.active]) {
        return { ...d, items: Object.fromEntries(Object.entries(d.items).map(([k, v]) => [k, normalize(v)])) };
      }
    }
    // Ancienne démo à un seul établissement : on la reprend telle quelle
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const s = JSON.parse(legacy) as AppState;
      if (s.version === STATE_VERSION) return { version: STATE_VERSION, active: "d1", items: { d1: normalize(s) } };
    }
  } catch {
    /* données illisibles : on repart de la démo */
  }
  return null;
}

/** Données de la démo gardées dans ce navigateur (pour les reprendre en créant un compte). */
export function localDemoData(): AppState[] | null {
  const d = loadDemo();
  return d ? Object.values(d.items) : null;
}

const summaryOf = (id: string, s: AppState): EstablishmentSummary => ({ id, name: s.establishment.name, type: s.establishment.type });

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => createDemoState());
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("loading");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const saveStatusRef = useRef<SaveStatus>("saved");
  useEffect(() => {
    saveStatusRef.current = saveStatus;
  }, [saveStatus]);
  const [establishments, setEstablishments] = useState<EstablishmentSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const demo = useRef<DemoStore | null>(null);
  const est = useRef<string | null>(null);
  const synced = useRef<Rows | null>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // ---- Annuler / rétablir (sur les plannings uniquement, 50 étapes) ----------
  const past = useRef<AppState["plans"][]>([]);
  const future = useRef<AppState["plans"][]>([]);
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

  const weekPref = () => {
    try {
      return localStorage.getItem(WEEK_KEY) ?? addWeeks(mondayOf(new Date()), 1);
    } catch {
      return addWeeks(mondayOf(new Date()), 1);
    }
  };

  // ---- Démarrage ----------------------------------------------------------------
  const boot = useCallback(async () => {
    const sb = getSupabase();
    const session = sb ? (await sb.auth.getSession()).data.session : null;
    clearHistory();
    if (!sb || !session) {
      est.current = null;
      synced.current = null;
      const d = loadDemo() ?? createDemoStore();
      demo.current = d;
      setEstablishments(Object.entries(d.items).map(([id, s]) => summaryOf(id, s)));
      setActiveId(d.active);
      setState(d.items[d.active]);
      setUserEmail(null);
      setNeedsSetup(false);
      setMode("demo");
      setReady(true);
      return;
    }
    demo.current = null;
    setUserEmail(session.user.email ?? null);
    // Compte salarié ? (sa propre fiche lui est lisible, rien d'autre)
    try {
      const { data: me } = await sb.from("employees").select("establishment_id").eq("user_id", session.user.id).limit(1);
      setIsEmployee(!!me?.length);
    } catch {
      setIsEmployee(false);
    }
    try {
      let list = await listEstablishments(sb);
      // Inscription depuis la démo : on reprend tous les établissements de la démo
      if (!list.length && localStorage.getItem(IMPORT_FLAG)) {
        for (const s of localDemoData() ?? []) await createEstablishmentFrom(sb, s);
        localStorage.removeItem(IMPORT_FLAG);
        list = await listEstablishments(sb);
      }
      setEstablishments(list);
      if (!list.length) {
        est.current = null;
        setActiveId(null);
        setNeedsSetup(true);
        setMode("cloud");
        setReady(true);
        return;
      }
      const wanted = localStorage.getItem(ACTIVE_KEY);
      const id = list.find((e) => e.id === wanted)?.id ?? list[0].id;
      const { state: loaded, rows } = await loadEstablishment(sb, id, weekPref());
      est.current = id;
      synced.current = rows;
      setActiveId(id);
      setState(loaded);
      setNeedsSetup(false);
      setMode("cloud");
      setReady(true);
    } catch {
      setSaveStatus("error");
      setMode("cloud");
      setReady(true);
    }
  }, [clearHistory]);

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

  // ---- Enregistrement : démo → navigateur ; compte → base (0,7 s après la dernière modification)
  const flush = useCallback(async () => {
    const sb = getSupabase();
    if (!sb || !est.current) return;
    setSaveStatus("saving");
    try {
      synced.current = await pushChanges(sb, est.current, synced.current, stateRef.current);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!ready || mode === "loading") return;
    if (mode === "demo") {
      const d = demo.current;
      if (!d || !activeId) return;
      d.items[activeId] = state;
      d.active = activeId;
      try {
        localStorage.setItem(KEY, JSON.stringify(d));
      } catch {
        /* stockage indisponible : la démo marche quand même */
      }
      setEstablishments((l) => l.map((e) => (e.id === activeId ? summaryOf(activeId, state) : e)));
      return;
    }
    try {
      localStorage.setItem(WEEK_KEY, state.currentWeek);
    } catch {
      /* ignore */
    }
    if (!est.current) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => void flush(), 700);
    return () => clearTimeout(timer);
  }, [state, ready, mode, activeId, flush]);

  // ---- Ce que l'équipe a fait de son côté (demandes, lectures) : relu toutes les minutes
  useEffect(() => {
    if (mode !== "cloud" || !ready) return;
    const sb = getSupabase();
    if (!sb) return;
    let stop = false;
    const pull = async () => {
      const id = est.current;
      if (!id || document.visibilityState !== "visible" || saveStatusRef.current === "saving") return;
      try {
        const t = await loadTeamActivity(sb, id);
        if (stop || id !== est.current || (saveStatusRef.current as SaveStatus) === "saving") return;
        setState((s) => {
          const next = { ...s, requests: t.requests, reads: t.reads };
          if (synced.current) synced.current = { ...synced.current, requests: toRows(next, id).requests };
          return next;
        });
      } catch {
        /* réseau coupé : on réessaiera */
      }
    };
    const timer = setInterval(() => void pull(), 60000);
    const onVisible = () => void pull();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [mode, ready]);

  // ---- Plusieurs établissements -------------------------------------------------
  const switchTo = useCallback(
    async (id: string) => {
      if (id === activeId) return;
      clearHistory();
      if (mode === "demo" && demo.current) {
        demo.current.items[demo.current.active] = stateRef.current;
        demo.current.active = id;
        setActiveId(id);
        setState(demo.current.items[id]);
        return;
      }
      const sb = getSupabase();
      if (!sb) return;
      await flush(); // on enregistre l'établissement qu'on quitte
      setReady(false);
      const { state: loaded, rows } = await loadEstablishment(sb, id, weekPref());
      est.current = id;
      synced.current = rows;
      try {
        localStorage.setItem(ACTIVE_KEY, id);
      } catch {
        /* ignore */
      }
      setActiveId(id);
      setState(loaded);
      setReady(true);
    },
    [activeId, mode, clearHistory, flush],
  );

  const addEstablishment = useCallback(
    async (s: AppState) => {
      clearHistory();
      if (mode === "demo" && demo.current) {
        demo.current.items[demo.current.active] = stateRef.current;
        const id = uid("d");
        demo.current.items[id] = s;
        demo.current.active = id;
        setEstablishments((l) => [...l, summaryOf(id, s)]);
        setActiveId(id);
        setState(s);
        return;
      }
      const sb = getSupabase();
      if (!sb) return;
      await flush();
      setSaveStatus("saving");
      try {
        const { est: id, rows } = await createEstablishmentFrom(sb, s);
        est.current = id;
        synced.current = rows;
        try {
          localStorage.setItem(ACTIVE_KEY, id);
        } catch {
          /* ignore */
        }
        setEstablishments((l) => [...l, { ...summaryOf(id, s), role: "owner" }]);
        setActiveId(id);
        setState(s);
        setNeedsSetup(false);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    },
    [mode, clearHistory, flush],
  );

  const removeEstablishment = useCallback(
    async (id: string) => {
      const rest = establishments.filter((e) => e.id !== id);
      if (mode === "demo" && demo.current) {
        if (!rest.length) return; // la démo garde au moins un établissement
        delete demo.current.items[id];
        setEstablishments(rest);
        if (id === activeId) {
          demo.current.active = rest[0].id;
          setActiveId(rest[0].id);
          setState(demo.current.items[rest[0].id]);
        }
        try {
          localStorage.setItem(KEY, JSON.stringify(demo.current));
        } catch {
          /* ignore */
        }
        return;
      }
      const sb = getSupabase();
      if (!sb) return;
      const { error } = await sb.from("establishments").delete().eq("id", id);
      if (error) throw error;
      setEstablishments(rest);
      if (id === activeId) {
        est.current = null;
        synced.current = null;
        if (rest.length) {
          const { state: loaded, rows } = await loadEstablishment(sb, rest[0].id, weekPref());
          est.current = rest[0].id;
          synced.current = rows;
          setActiveId(rest[0].id);
          setState(loaded);
        } else {
          setActiveId(null);
          setNeedsSetup(true);
        }
      }
    },
    [establishments, mode, activeId],
  );

  const demoItem = useCallback((id: string) => (id === activeId ? stateRef.current : demo.current?.items[id]), [activeId]);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
    est.current = null;
    synced.current = null;
    try {
      localStorage.removeItem(WEEK_KEY);
      localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // ---- Modifications ------------------------------------------------------------
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
      setState((s) => {
        const before = s.plans[week] ?? [];
        const after = fn(before);
        // Semaine déjà publiée : chaque changement est noté dans l'historique
        const meta = s.weekMeta?.[week];
        let weekMeta = s.weekMeta;
        if (meta?.status === "published") {
          const at = new Date().toISOString();
          const added = diffWeek(before, after).map((c) => ({ at, employeeId: c.employeeId, text: changeText(c) }));
          if (added.length) weekMeta = { ...weekMeta, [week]: { ...meta, changes: [...(meta.changes ?? []), ...added].slice(-300) } };
        }
        return { ...s, plans: { ...s.plans, [week]: after }, weekMeta };
      });
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
    const d = createDemoStore();
    demo.current = d;
    setEstablishments(Object.entries(d.items).map(([id, s]) => summaryOf(id, s)));
    setActiveId(d.active);
    setState(d.items[d.active]);
  }, [clearHistory]);

  const replace = useCallback(
    (s: AppState) => {
      clearHistory();
      // Connecté sans aucun établissement : on le crée dans la base
      if (mode === "cloud" && !est.current) {
        void addEstablishment(s);
        return;
      }
      setState(s);
    },
    [clearHistory, mode, addEstablishment],
  );

  return (
    <AppContext.Provider
      value={{
        state,
        ready,
        mode,
        needsSetup,
        isEmployee,
        userEmail,
        saveStatus,
        signOut,
        establishments,
        activeId,
        switchTo,
        addEstablishment,
        removeEstablishment,
        demoItem,
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
