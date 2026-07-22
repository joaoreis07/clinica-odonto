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
  /** Quantidade de orçamentos fechados no ciclo */
  targetCount: number;
  /** Valor do bônus se a meta for batida */
  bonusAmount: number;
}

export const DEFAULT_BUDGET_META: BudgetMeta = {
  targetCount: 10,
  bonusAmount: 0,
};
