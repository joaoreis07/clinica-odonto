"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  CalendarDays,
  FileDown,
  Plus,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PAYMENT_METHODS, getToday } from "../data";
import { useFinance } from "../context";
import type { MonthlyPaymentFormData } from "../monthly-types";
import type { PaymentMethod } from "../types";
import {
  formatCurrency,
  formatDateBR,
  formatLongDate,
  paymentBadgeClass,
} from "../utils";
import { generateMonthlyFinancePdf } from "@/modules/reports/generate-monthly-finance-pdf";

function currentMonthValue() {
  return getToday().slice(0, 7);
}

function formatMonthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

const emptyForm = (): MonthlyPaymentFormData => ({
  patientName: "",
  amount: "",
  paymentMethod: "PIX",
  responsible: "",
  referenceMonth: currentMonthValue(),
  paidAt: getToday(),
  notes: "",
});

export function MonthlyFinanceDashboard() {
  const {
    monthlyPayments,
    addMonthlyPayment,
    removeMonthlyPayment,
    team,
    ready,
    syncing,
  } = useFinance();

  const [monthFilter, setMonthFilter] = useState(currentMonthValue());
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<MonthlyPaymentFormData>(emptyForm);

  const monthOptions = useMemo(() => {
    const set = new Set<string>([currentMonthValue()]);
    monthlyPayments.forEach((p) => set.add(p.referenceMonth));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [monthlyPayments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...monthlyPayments]
      .filter((p) => p.referenceMonth === monthFilter)
      .filter(
        (p) =>
          !q ||
          p.patientName.toLowerCase().includes(q) ||
          p.responsible.toLowerCase().includes(q) ||
          (p.notes || "").toLowerCase().includes(q),
      )
      .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  }, [monthlyPayments, monthFilter, search]);

  const totalMonth = filtered.reduce((s, p) => s + p.amount, 0);
  const todayCount = monthlyPayments.filter(
    (p) => p.paidAt === getToday(),
  ).length;

  function handleSave() {
    const amount = Number(
      form.amount.replace(/\./g, "").replace(",", "."),
    );
    if (!form.patientName.trim() || !Number.isFinite(amount) || amount <= 0) {
      window.alert("Informe o paciente e um valor válido.");
      return;
    }
    if (!form.responsible) {
      window.alert("Selecione quem recebeu.");
      return;
    }
    addMonthlyPayment({
      id: `mp-${Date.now()}`,
      patientName: form.patientName.trim(),
      amount,
      paymentMethod: form.paymentMethod,
      responsible: form.responsible,
      referenceMonth: form.referenceMonth,
      paidAt: form.paidAt,
      notes: form.notes.trim() || undefined,
    });
    setModalOpen(false);
    setForm(emptyForm());
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="hidden text-2xl font-semibold tracking-[-0.04em] text-slate-900 lg:block">
            Financeiro
          </h2>
          <p className="text-sm text-slate-500 lg:mt-1">
            Quem pagou no mês · {formatMonthLabel(monthFilter)}
          </p>
          {!ready ? (
            <p className="mt-1 text-xs text-slate-400">Carregando dados…</p>
          ) : syncing ? (
            <p className="mt-1 text-xs text-blue-600">Sincronizando…</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() =>
              generateMonthlyFinancePdf(monthFilter, monthlyPayments)
            }
          >
            <FileDown className="size-4" />
            Relatório do mês
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => {
              setForm(emptyForm());
              setModalOpen(true);
            }}
          >
            <Plus className="size-4" />
            Registrar pagamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 xl:gap-4">
        {[
          {
            label: "Pagamentos no mês",
            value: String(filtered.length),
            hint: formatMonthLabel(monthFilter),
            icon: Users,
            accent: "bg-blue-50 text-blue-600",
          },
          {
            label: "Total do mês",
            value: formatCurrency(totalMonth),
            hint: "Soma das mensalidades filtradas",
            icon: Wallet,
            accent: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Recebidos hoje",
            value: String(todayCount),
            hint: formatLongDate(getToday()),
            icon: CalendarDays,
            accent: "bg-amber-50 text-amber-600",
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            className={cn(
              "rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-5",
              i === 2 ? "col-span-2 xl:col-span-1" : "",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-slate-500 sm:text-sm">{card.label}</p>
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-xl sm:size-10",
                  card.accent,
                )}
              >
                <card.icon className="size-3.5 sm:size-4" />
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold tracking-[-0.04em] text-slate-900 sm:mt-5 sm:text-2xl">
              {card.value}
            </p>
            <p className="mt-1 text-[11px] capitalize text-slate-400 sm:text-xs">
              {card.hint}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-1.5">
            <Label className="text-xs text-slate-500">Mês de referência</Label>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {formatMonthLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid flex-1 gap-1.5">
            <Label className="text-xs text-slate-500">Buscar paciente</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, responsável…"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 sm:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Nenhum pagamento neste mês ainda.
          </div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{p.patientName}</p>
                  <p className="text-xs text-slate-500">
                    Pago em {formatDateBR(p.paidAt)} · {p.responsible}
                  </p>
                </div>
                <p className="font-semibold text-emerald-700">
                  {formatCurrency(p.amount)}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
                    paymentBadgeClass(p.paymentMethod),
                  )}
                >
                  {p.paymentMethod}
                </span>
                <button
                  type="button"
                  className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remover pagamento de ${p.patientName}?`,
                      )
                    ) {
                      removeMonthlyPayment(p.id);
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Paciente</th>
              <th className="px-4 py-3 font-semibold">Pago em</th>
              <th className="px-4 py-3 font-semibold">Pagamento</th>
              <th className="px-4 py-3 font-semibold">Responsável</th>
              <th className="px-4 py-3 text-right font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  Nenhum pagamento neste mês ainda.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {p.patientName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateBR(p.paidAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
                        paymentBadgeClass(p.paymentMethod),
                      )}
                    >
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.responsible}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remover pagamento de ${p.patientName}?`,
                          )
                        ) {
                          removeMonthlyPayment(p.id);
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar pagamento mensal</DialogTitle>
            <DialogDescription>
              Anote quem pagou a mensalidade.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Paciente</Label>
              <Input
                value={form.patientName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, patientName: e.target.value }))
                }
                placeholder="Nome de quem pagou"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Valor</Label>
              <Input
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Forma de pagamento</Label>
              <Select
                value={form.paymentMethod}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    paymentMethod: v as PaymentMethod,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Mês de referência</Label>
              <Input
                type="month"
                value={form.referenceMonth}
                onChange={(e) =>
                  setForm((f) => ({ ...f, referenceMonth: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Data do pagamento</Label>
              <Input
                type="date"
                value={form.paidAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paidAt: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Quem recebeu</Label>
              <Select
                value={form.responsible || undefined}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, responsible: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
