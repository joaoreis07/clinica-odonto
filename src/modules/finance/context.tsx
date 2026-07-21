"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { TEAM as DEFAULT_TEAM, initialMovements } from "./data";
import type { FinanceMovement } from "./types";

const MOVEMENTS_KEY = "clinica-odonto-movements";
const TEAM_KEY = "clinica-odonto-team";

type FinanceContextValue = {
  movements: FinanceMovement[];
  addMovement: (movement: FinanceMovement) => void;
  removeMovement: (id: string) => void;
  team: string[];
  addResponsible: (name: string) => boolean;
  removeResponsible: (name: string) => void;
  ready: boolean;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

function loadMovements(): FinanceMovement[] {
  if (typeof window === "undefined") return initialMovements;
  try {
    const raw = window.localStorage.getItem(MOVEMENTS_KEY);
    if (!raw) return initialMovements;
    const parsed = JSON.parse(raw) as FinanceMovement[];
    return Array.isArray(parsed) ? parsed : initialMovements;
  } catch {
    return initialMovements;
  }
}

function loadTeam(): string[] {
  if (typeof window === "undefined") return DEFAULT_TEAM;
  try {
    const raw = window.localStorage.getItem(TEAM_KEY);
    if (raw === null) return DEFAULT_TEAM;
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : DEFAULT_TEAM;
  } catch {
    return DEFAULT_TEAM;
  }
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [movements, setMovements] = useState<FinanceMovement[]>(initialMovements);
  const [team, setTeam] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMovements(loadMovements());
    setTeam(loadTeam());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
  }, [movements, ready]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(TEAM_KEY, JSON.stringify(team));
  }, [team, ready]);

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
      if (
        team.some((item) => item.toLowerCase() === cleaned.toLowerCase())
      ) {
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
    }),
    [
      movements,
      addMovement,
      removeMovement,
      team,
      addResponsible,
      removeResponsible,
      ready,
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
