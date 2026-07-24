import type { PaymentMethod } from "./types";

/** Pagamento mensal (mensalidade) — quem pagou no mês. */
export interface MonthlyPayment {
  id: string;
  patientName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  responsible: string;
  /** Mês de referência no formato yyyy-mm */
  referenceMonth: string;
  /** Data em que o pagamento foi recebido (yyyy-mm-dd) */
  paidAt: string;
  notes?: string;
}

export interface MonthlyPaymentFormData {
  patientName: string;
  amount: string;
  paymentMethod: PaymentMethod;
  responsible: string;
  referenceMonth: string;
  paidAt: string;
  notes: string;
}

export function normalizeMonthlyPayment(raw: unknown): MonthlyPayment | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<MonthlyPayment>;
  if (!data.id || !data.patientName) return null;
  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const referenceMonth =
    typeof data.referenceMonth === "string" && /^\d{4}-\d{2}$/.test(data.referenceMonth)
      ? data.referenceMonth
      : typeof data.paidAt === "string" && data.paidAt.length >= 7
        ? data.paidAt.slice(0, 7)
        : "";

  const paidAt =
    typeof data.paidAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.paidAt)
      ? data.paidAt
      : "";

  if (!referenceMonth || !paidAt) return null;

  return {
    id: String(data.id),
    patientName: String(data.patientName).trim(),
    amount,
    paymentMethod: (data.paymentMethod as PaymentMethod) || "PIX",
    responsible: String(data.responsible || "").trim() || "—",
    referenceMonth,
    paidAt,
    notes: data.notes ? String(data.notes).trim() : undefined,
  };
}
