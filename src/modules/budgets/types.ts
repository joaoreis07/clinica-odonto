export interface BudgetClosing {
  id: string;
  patientName: string;
  description: string;
  amount: number;
  closedAt: string; // yyyy-mm-dd
  responsible: string;
  notes?: string;
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
