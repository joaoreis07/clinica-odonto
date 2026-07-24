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
import {
  DEFAULT_BUDGET_META,
  normalizeBudgetClosing,
  type BudgetClosing,
  type BudgetMeta,
} from "@/modules/budgets/types";

const LOCAL_MOVEMENTS_KEY = "clinica-odonto-movements";
const LOCAL_TEAM_KEY = "clinica-odonto-team";

type StoreSnapshot = {
  movements: FinanceMovement[];
  team: string[];
  budgetClosings: BudgetClosing[];
  budgetMeta: BudgetMeta;
};

type FinanceContextValue = {
  movements: FinanceMovement[];
  addMovement: (movement: FinanceMovement) => void;
  removeMovement: (id: string) => void;
  team: string[];
  addResponsible: (name: string) => boolean;
  removeResponsible: (name: string) => void;
  budgetClosings: BudgetClosing[];
  addBudgetClosing: (closing: BudgetClosing) => void;
  updateBudgetClosing: (
    id: string,
    patch: Partial<BudgetClosing> | ((current: BudgetClosing) => BudgetClosing),
  ) => void;
  removeBudgetClosing: (id: string) => void;
  budgetMeta: BudgetMeta;
  updateBudgetMeta: (meta: BudgetMeta) => void;
  ready: boolean;
  syncing: boolean;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

function readLocalFallback(): Pick<StoreSnapshot, "movements" | "team"> {
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
  const [budgetClosings, setBudgetClosings] = useState<BudgetClosing[]>([]);
  const [budgetMeta, setBudgetMeta] = useState<BudgetMeta>(DEFAULT_BUDGET_META);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  const persist = useCallback(async (snapshot: StoreSnapshot) => {
    setSyncing(true);
    try {
      await fetch("/api/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const response = await fetch("/api/store", { cache: "no-store" });
        if (!response.ok) throw new Error("Falha ao carregar dados");
        const data = (await response.json()) as Partial<StoreSnapshot>;

        const remoteMovements = Array.isArray(data.movements) ? data.movements : [];
        const remoteTeam = Array.isArray(data.team) ? data.team : [];
        const remoteClosings = Array.isArray(data.budgetClosings)
          ? data.budgetClosings
              .map((item) => normalizeBudgetClosing(item))
              .filter((item): item is BudgetClosing => item !== null)
          : [];
        const remoteMeta = data.budgetMeta ?? DEFAULT_BUDGET_META;
        const local = readLocalFallback();

        const shouldMigrate =
          remoteMovements.length === 0 &&
          remoteTeam.length === 0 &&
          (local.movements.length > 0 || local.team.length > 0);

        const next: StoreSnapshot = {
          movements: shouldMigrate ? local.movements : remoteMovements,
          team: shouldMigrate ? local.team : remoteTeam,
          budgetClosings: remoteClosings,
          budgetMeta: {
            targetRevenue:
              Number(remoteMeta.targetRevenue) > 0
                ? Number(remoteMeta.targetRevenue)
                : DEFAULT_BUDGET_META.targetRevenue,
            bonusAmount:
              Number(remoteMeta.bonusAmount) >= 0
                ? Number(remoteMeta.bonusAmount)
                : 0,
          },
        };

        if (!cancelled) {
          skipNextSave.current = !shouldMigrate;
          setMovements(next.movements);
          setTeam(next.team);
          setBudgetClosings(next.budgetClosings);
          setBudgetMeta(next.budgetMeta);
          setReady(true);
        }

        if (shouldMigrate) {
          await persist(next);
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
          setBudgetClosings([]);
          setBudgetMeta(DEFAULT_BUDGET_META);
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
      void persist({ movements, team, budgetClosings, budgetMeta });
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [movements, team, budgetClosings, budgetMeta, ready, persist]);

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

  const addBudgetClosing = useCallback((closing: BudgetClosing) => {
    setBudgetClosings((prev) => [closing, ...prev]);
  }, []);

  const updateBudgetClosing = useCallback(
    (
      id: string,
      patch:
        | Partial<BudgetClosing>
        | ((current: BudgetClosing) => BudgetClosing),
    ) => {
      setBudgetClosings((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          return typeof patch === "function" ? patch(item) : { ...item, ...patch };
        }),
      );
    },
    [],
  );

  const removeBudgetClosing = useCallback((id: string) => {
    setBudgetClosings((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateBudgetMeta = useCallback((meta: BudgetMeta) => {
    setBudgetMeta({
      targetRevenue: Math.max(0.01, Number(meta.targetRevenue) || 0.01),
      bonusAmount: Math.max(0, Number(meta.bonusAmount) || 0),
    });
  }, []);

  const value = useMemo(
    () => ({
      movements,
      addMovement,
      removeMovement,
      team,
      addResponsible,
      removeResponsible,
      budgetClosings,
      addBudgetClosing,
      updateBudgetClosing,
      removeBudgetClosing,
      budgetMeta,
      updateBudgetMeta,
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
      budgetClosings,
      addBudgetClosing,
      updateBudgetClosing,
      removeBudgetClosing,
      budgetMeta,
      updateBudgetMeta,
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
