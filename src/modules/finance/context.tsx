"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { FinanceMovement } from "./types";

const LOCAL_MOVEMENTS_KEY = "clinica-odonto-movements";
const LOCAL_TEAM_KEY = "clinica-odonto-team";

type FinanceContextValue = {
  movements: FinanceMovement[];
  addMovement: (movement: FinanceMovement) => void;
  removeMovement: (id: string) => void;
  team: string[];
  addResponsible: (name: string) => boolean;
  removeResponsible: (name: string) => void;
  ready: boolean;
  syncing: boolean;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

function readLocalFallback(): { movements: FinanceMovement[]; team: string[] } {
  if (typeof window === "undefined") return { movements: [], team: [] };
  try {
    const movementsRaw = window.localStorage.getItem(LOCAL_MOVEMENTS_KEY);
    const teamRaw = window.localStorage.getItem(LOCAL_TEAM_KEY);
    const movements = movementsRaw
      ? (JSON.parse(movementsRaw) as FinanceMovement[])
      : [];
    const team = teamRaw ? (JSON.parse(teamRaw) as string[]) : [];
    return {
      movements: Array.isArray(movements) ? movements : [],
      team: Array.isArray(team) ? team : [],
    };
  } catch {
    return { movements: [], team: [] };
  }
}

function clearLocalFallback() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_MOVEMENTS_KEY);
  window.localStorage.removeItem(LOCAL_TEAM_KEY);
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [movements, setMovements] = useState<FinanceMovement[]>([]);
  const [team, setTeam] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  const persist = useCallback(
    async (nextMovements: FinanceMovement[], nextTeam: string[]) => {
      setSyncing(true);
      try {
        await fetch("/api/store", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            movements: nextMovements,
            team: nextTeam,
          }),
        });
      } catch (error) {
        console.error(error);
      } finally {
        setSyncing(false);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const response = await fetch("/api/store", { cache: "no-store" });
        if (!response.ok) throw new Error("Falha ao carregar dados");
        const data = (await response.json()) as {
          movements?: FinanceMovement[];
          team?: string[];
        };

        const remoteMovements = Array.isArray(data.movements) ? data.movements : [];
        const remoteTeam = Array.isArray(data.team) ? data.team : [];
        const local = readLocalFallback();

        // Migra dados antigos do computador para o armazenamento compartilhado
        const shouldMigrate =
          remoteMovements.length === 0 &&
          remoteTeam.length === 0 &&
          (local.movements.length > 0 || local.team.length > 0);

        const nextMovements = shouldMigrate ? local.movements : remoteMovements;
        const nextTeam = shouldMigrate ? local.team : remoteTeam;

        if (!cancelled) {
          skipNextSave.current = !shouldMigrate;
          setMovements(nextMovements);
          setTeam(nextTeam);
          setReady(true);
        }

        if (shouldMigrate) {
          await persist(nextMovements, nextTeam);
          clearLocalFallback();
        } else if (local.movements.length > 0 || local.team.length > 0) {
          clearLocalFallback();
        }
      } catch {
        const local = readLocalFallback();
        if (!cancelled) {
          skipNextSave.current = true;
          setMovements(local.movements);
          setTeam(local.team);
          setReady(true);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [persist]);

  useEffect(() => {
    if (!ready) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persist(movements, team);
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [movements, team, ready, persist]);

  const addMovement = useCallback((movement: FinanceMovement) => {
    setMovements((prev) => [movement, ...prev]);
  }, []);

  const removeMovement = useCallback((id: string) => {
    setMovements((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addResponsible = useCallback(
    (name: string) => {
      const cleaned = name.trim().replace(/\s+/g, " ");
      if (!cleaned) return false;
      if (team.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
        return false;
      }
      setTeam((prev) =>
        [...prev, cleaned].sort((a, b) => a.localeCompare(b, "pt-BR")),
      );
      return true;
    },
    [team],
  );

  const removeResponsible = useCallback((name: string) => {
    setTeam((prev) => prev.filter((item) => item !== name));
  }, []);

  const value = useMemo(
    () => ({
      movements,
      addMovement,
      removeMovement,
      team,
      addResponsible,
      removeResponsible,
      ready,
      syncing,
    }),
    [
      movements,
      addMovement,
      removeMovement,
      team,
      addResponsible,
      removeResponsible,
      ready,
      syncing,
    ],
  );

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error("useFinance deve ser usado dentro de FinanceProvider");
  }
  return ctx;
}
