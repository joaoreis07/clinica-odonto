export type BudgetStatus = "rascunho" | "fechado";

export interface BudgetItem {
  id: string;
  description: string;
  amount: number;
}

export interface BudgetClosing {
  id: string;
  patientName: string;
  /** Resumo automático dos procedimentos */
  description: string;
  /** Total dos procedimentos */
  amount: number;
  closedAt: string; // yyyy-mm-dd (data do fechamento; rascunho pode ficar vazio)
  responsible: string;
  notes?: string;
  status: BudgetStatus;
  items: BudgetItem[];
  createdAt: string; // yyyy-mm-dd
}

export interface BudgetMeta {
  /** Meta de faturamento do ciclo (R$) */
  targetRevenue: number;
  /** Valor do bônus se a meta for batida */
  bonusAmount: number;
}

export const DEFAULT_BUDGET_META: BudgetMeta = {
  targetRevenue: 10000,
  bonusAmount: 0,
};

export function budgetItemsTotal(items: BudgetItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function budgetItemsSummary(items: BudgetItem[]): string {
  if (items.length === 0) return "Sem procedimentos";
  if (items.length === 1) return items[0].description;
  return `${items.length} procedimentos`;
}

/** Normaliza orçamentos antigos (sem items/status) para o formato novo. */
export function normalizeBudgetClosing(raw: unknown): BudgetClosing | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<BudgetClosing> & {
    description?: string;
    amount?: number;
  };

  if (!data.id || !data.patientName) return null;

  const legacyAmount = Number(data.amount) || 0;
  const legacyDescription = String(data.description || "").trim();
  const items = Array.isArray(data.items)
    ? data.items
        .filter(
          (item) =>
            item &&
            typeof item === "object" &&
            String((item as BudgetItem).description || "").trim() &&
            Number((item as BudgetItem).amount) > 0,
        )
        .map((item) => ({
          id: String((item as BudgetItem).id || `i-${Math.random()}`),
          description: String((item as BudgetItem).description).trim(),
          amount: Number((item as BudgetItem).amount),
        }))
    : legacyAmount > 0
      ? [
          {
            id: `i-legacy-${data.id}`,
            description: legacyDescription || "Orçamento",
            amount: legacyAmount,
          },
        ]
      : [];

  const status: BudgetStatus =
    data.status === "rascunho" || data.status === "fechado"
      ? data.status
      : "fechado";

  const amount = budgetItemsTotal(items);
  const description = budgetItemsSummary(items);

  return {
    id: String(data.id),
    patientName: String(data.patientName).trim(),
    description,
    amount,
    closedAt: String(data.closedAt || data.createdAt || ""),
    responsible: String(data.responsible || ""),
    notes: data.notes ? String(data.notes) : undefined,
    status,
    items,
    createdAt: String(data.createdAt || data.closedAt || ""),
  };
}
