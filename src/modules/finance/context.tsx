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
import { initialMovements } from "./data";
import type { FinanceMovement } from "./types";

const STORAGE_KEY = "clinica-odonto-movements";

type FinanceContextValue = {
  movements: FinanceMovement[];
  addMovement: (movement: FinanceMovement) => void;
  ready: boolean;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

function loadMovements(): FinanceMovement[] {
  if (typeof window === "undefined") return initialMovements;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialMovements;
    const parsed = JSON.parse(raw) as FinanceMovement[];
    return Array.isArray(parsed) ? parsed : initialMovements;
  } catch {
    return initialMovements;
  }
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [movements, setMovements] = useState<FinanceMovement[]>(initialMovements);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMovements(loadMovements());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(movements));
  }, [movements, ready]);

  const addMovement = useCallback((movement: FinanceMovement) => {
    setMovements((prev) => [movement, ...prev]);
  }, []);

  const value = useMemo(
    () => ({ movements, addMovement, ready }),
    [movements, addMovement, ready],
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
