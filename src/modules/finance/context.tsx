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
  normalizeMonthlyPayment,
  type MonthlyPayment,
} from "./monthly-types";
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
  monthlyPayments: MonthlyPayment[];
  team: string[];
  budgetClosings: BudgetClosing[];
  budgetMeta: BudgetMeta;
};

type FinanceContextValue = {
  movements: FinanceMovement[];
  addMovement: (movement: FinanceMovement) => void;
  removeMovement: (id: string) => void;
  monthlyPayments: MonthlyPayment[];
  addMonthlyPayment: (payment: MonthlyPayment) => void;
  removeMonthlyPayment: (id: string) => void;
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
  const [monthlyPayments, setMonthlyPayments] = useState<MonthlyPayment[]>([]);
  const [team, setTeam] = useState<string[]>([]);
  const [budgetClosings, setBudgetClosings] = useState<BudgetClosing[]>([]);
  const [budgetMeta, setBudgetMeta] = useState<BudgetMeta>(DEFAULT_BUDGET_META);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const snapshotRef = useRef<StoreSnapshot>({
    movements: [],
    monthlyPayments: [],
    team: [],
    budgetClosings: [],
    budgetMeta: DEFAULT_BUDGET_META,
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);
  const saveVersion = useRef(0);
  const writing = useRef(false);
  const writeAgain = useRef(false);

  const writeLatest = useCallback(async () => {
    if (writing.current) {
      writeAgain.current = true;
      return;
    }

    writing.current = true;
    setSyncing(true);
    try {
      do {
        writeAgain.current = false;
        const version = saveVersion.current;
        const snapshot = snapshotRef.current;
        await fetch("/api/store", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        });
        // Se mudou durante o PUT, grava de novo o estado mais novo
        if (saveVersion.current !== version) {
          writeAgain.current = true;
        }
      } while (writeAgain.current);
    } catch (error) {
      console.error(error);
    } finally {
      writing.current = false;
      setSyncing(false);
    }
  }, []);

  const scheduleSave = useCallback(
    (immediate = false) => {
      if (skipNextSave.current) {
        skipNextSave.current = false;
        return;
      }
      saveVersion.current += 1;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (immediate) {
        void writeLatest();
        return;
      }
      saveTimer.current = setTimeout(() => {
        void writeLatest();
      }, 350);
    },
    [writeLatest],
  );

  useEffect(() => {
    snapshotRef.current = {
      movements,
      monthlyPayments,
      team,
      budgetClosings,
      budgetMeta,
    };
  }, [movements, monthlyPayments, team, budgetClosings, budgetMeta]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const response = await fetch("/api/store", { cache: "no-store" });
        if (!response.ok) throw new Error("Falha ao carregar dados");
        const data = (await response.json()) as Partial<StoreSnapshot>;

        const remoteMovements = Array.isArray(data.movements) ? data.movements : [];
        const remoteMonthly = Array.isArray(data.monthlyPayments)
          ? data.monthlyPayments
              .map((item) => normalizeMonthlyPayment(item))
              .filter((item): item is MonthlyPayment => item !== null)
          : [];
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
          monthlyPayments: remoteMonthly,
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
          snapshotRef.current = next;
          setMovements(next.movements);
          setMonthlyPayments(next.monthlyPayments);
          setTeam(next.team);
          setBudgetClosings(next.budgetClosings);
          setBudgetMeta(next.budgetMeta);
          setReady(true);
        }

        if (shouldMigrate) {
          await fetch("/api/store", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
          });
          clearLocalFallback();
        } else if (local.movements.length > 0 || local.team.length > 0) {
          clearLocalFallback();
        }
      } catch {
        const local = readLocalFallback();
        if (!cancelled) {
          skipNextSave.current = true;
          const next: StoreSnapshot = {
            movements: local.movements,
            monthlyPayments: [],
            team: local.team,
            budgetClosings: [],
            budgetMeta: DEFAULT_BUDGET_META,
          };
          snapshotRef.current = next;
          setMovements(next.movements);
          setMonthlyPayments(next.monthlyPayments);
          setTeam(next.team);
          setBudgetClosings(next.budgetClosings);
          setBudgetMeta(next.budgetMeta);
          setReady(true);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    scheduleSave(false);
  }, [
    movements,
    monthlyPayments,
    team,
    budgetClosings,
    budgetMeta,
    ready,
    scheduleSave,
  ]);

  const addMovement = useCallback((movement: FinanceMovement) => {
    setMovements((prev) => [movement, ...prev]);
  }, []);

  const removeMovement = useCallback(
    (id: string) => {
      setMovements((prev) => {
        const next = prev.filter((item) => item.id !== id);
        snapshotRef.current = { ...snapshotRef.current, movements: next };
        return next;
      });
      scheduleSave(true);
    },
    [scheduleSave],
  );

  const addMonthlyPayment = useCallback((payment: MonthlyPayment) => {
    setMonthlyPayments((prev) => [payment, ...prev]);
  }, []);

  const removeMonthlyPayment = useCallback(
    (id: string) => {
      setMonthlyPayments((prev) => {
        const next = prev.filter((item) => item.id !== id);
        snapshotRef.current = {
          ...snapshotRef.current,
          monthlyPayments: next,
        };
        return next;
      });
      scheduleSave(true);
    },
    [scheduleSave],
  );

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

  const removeBudgetClosing = useCallback(
    (id: string) => {
      setBudgetClosings((prev) => {
        const next = prev.filter((item) => item.id !== id);
        snapshotRef.current = {
          ...snapshotRef.current,
          budgetClosings: next,
        };
        return next;
      });
      scheduleSave(true);
    },
    [scheduleSave],
  );

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
      monthlyPayments,
      addMonthlyPayment,
      removeMonthlyPayment,
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
      monthlyPayments,
      addMonthlyPayment,
      removeMonthlyPayment,
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
