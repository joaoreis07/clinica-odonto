import { get, put } from "@vercel/blob";
import type { FinanceMovement } from "@/modules/finance/types";
import {
  normalizeMonthlyPayment,
  type MonthlyPayment,
} from "@/modules/finance/monthly-types";
import {
  DEFAULT_BUDGET_META,
  normalizeBudgetClosing,
  type BudgetClosing,
  type BudgetMeta,
} from "@/modules/budgets/types";

export type ClinicStore = {
  movements: FinanceMovement[];
  monthlyPayments: MonthlyPayment[];
  team: string[];
  budgetClosings: BudgetClosing[];
  budgetMeta: BudgetMeta;
  updatedAt: string;
};

export const EMPTY_STORE: ClinicStore = {
  movements: [],
  monthlyPayments: [],
  team: [],
  budgetClosings: [],
  budgetMeta: DEFAULT_BUDGET_META,
  updatedAt: new Date(0).toISOString(),
};

const BLOB_PATHNAME = "clinic-store.json";

function normalizeMeta(meta: unknown): BudgetMeta {
  if (!meta || typeof meta !== "object") return DEFAULT_BUDGET_META;
  const parsed = meta as Partial<BudgetMeta>;
  const targetRevenue = Number(parsed.targetRevenue);
  const bonusAmount = Number(parsed.bonusAmount);
  return {
    targetRevenue:
      Number.isFinite(targetRevenue) && targetRevenue > 0
        ? targetRevenue
        : DEFAULT_BUDGET_META.targetRevenue,
    bonusAmount:
      Number.isFinite(bonusAmount) && bonusAmount >= 0 ? bonusAmount : 0,
  };
}

function normalizeStore(data: unknown): ClinicStore {
  if (!data || typeof data !== "object") return EMPTY_STORE;
  const parsed = data as Partial<ClinicStore>;
  return {
    movements: Array.isArray(parsed.movements) ? parsed.movements : [],
    monthlyPayments: Array.isArray(parsed.monthlyPayments)
      ? parsed.monthlyPayments
          .map((item) => normalizeMonthlyPayment(item))
          .filter((item): item is MonthlyPayment => item !== null)
      : [],
    team: Array.isArray(parsed.team) ? parsed.team : [],
    budgetClosings: Array.isArray(parsed.budgetClosings)
      ? parsed.budgetClosings
          .map((item) => normalizeBudgetClosing(item))
          .filter((item): item is BudgetClosing => item !== null)
      : [],
    budgetMeta: normalizeMeta(parsed.budgetMeta),
    updatedAt:
      typeof parsed.updatedAt === "string"
        ? parsed.updatedAt
        : new Date().toISOString(),
  };
}

export async function readClinicStore(): Promise<ClinicStore> {
  try {
    const result = await get(BLOB_PATHNAME, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return EMPTY_STORE;
    }

    const text = await new Response(result.stream).text();
    return normalizeStore(JSON.parse(text));
  } catch {
    return EMPTY_STORE;
  }
}

export async function writeClinicStore(
  store: Omit<ClinicStore, "updatedAt">,
): Promise<ClinicStore> {
  const next: ClinicStore = {
    movements: store.movements,
    monthlyPayments: store.monthlyPayments,
    team: store.team,
    budgetClosings: store.budgetClosings,
    budgetMeta: normalizeMeta(store.budgetMeta),
    updatedAt: new Date().toISOString(),
  };

  await put(BLOB_PATHNAME, JSON.stringify(next), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });

  return next;
}
