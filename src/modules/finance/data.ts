import type { FinanceMovement, PaymentMethod } from "./types";

/** Data de hoje no fuso local (yyyy-mm-dd) */
export function getToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  "PIX",
  "Dinheiro",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Transferência",
];

export const TEAM: string[] = [];

/** Caixa inicia vazio — sem movimentações de demonstração */
export const initialMovements: FinanceMovement[] = [];
