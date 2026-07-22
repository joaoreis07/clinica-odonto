"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Gift,
  Plus,
  Target,
  Trash2,
  Trophy,
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
import { useFinance } from "@/modules/finance/context";
import { getToday } from "@/modules/finance/data";
import { formatCurrency, formatDateBR } from "@/modules/finance/utils";
import {
  daysLeftInCycle,
  filterCycleClosings,
  formatCycleLong,
  getBudgetCycle,
} from "../cycle";
import type { BudgetClosing } from "../types";

type FormState = {
  patientName: string;
  description: string;
  amount: string;
  closedAt: string;
  responsible: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  patientName: "",
  description: "",
  amount: "",
  closedAt: getToday(),
  responsible: "",
  notes: "",
});

export function BudgetsDashboard() {
  const {
    budgetClosings,
    addBudgetClosing,
    removeBudgetClosing,
    budgetMeta,
    updateBudgetMeta,
    team,
    ready,
    syncing,
  } = useFinance();

  const cycle = useMemo(() => getBudgetCycle(new Date()), []);
  const cycleClosings = useMemo(
    () => filterCycleClosings(budgetClosings, cycle),
    [budgetClosings, cycle],
  );

  const totalAmount = cycleClosings.reduce((sum, item) => sum + item.amount, 0);
  const progress = Math.min(
    100,
    Math.round((cycleClosings.length / Math.max(budgetMeta.targetCount, 1)) * 100),
  );
  const metaHit = cycleClosings.length >= budgetMeta.targetCount;
  const daysLeft = daysLeftInCycle(cycle);

  const [modalOpen, setModalOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [metaForm, setMetaForm] = useState({
    targetCount: String(budgetMeta.targetCount),
    bonusAmount: String(budgetMeta.bonusAmount || ""),
  });

  function openMeta() {
    setMetaForm({
      targetCount: String(budgetMeta.targetCount),
      bonusAmount: String(budgetMeta.bonusAmount || ""),
    });
    setMetaOpen(true);
  }

  function saveMeta() {
    const targetCount = Number(metaForm.targetCount.replace(/\D/g, ""));
    const bonusAmount = Number(
      metaForm.bonusAmount.replace(",", ".").replace(/[^\d.]/g, ""),
    );
    if (!targetCount || targetCount <= 0) return;
    updateBudgetMeta({
      targetCount,
      bonusAmount: Number.isFinite(bonusAmount) ? bonusAmount : 0,
    });
    setMetaOpen(false);
  }

  function saveClosing() {
    const amount = Number(
      form.amount.replace(",", ".").replace(/[^\d.]/g, ""),
    );
    if (
      !form.patientName.trim() ||
      !form.description.trim() ||
      !form.responsible ||
      !form.closedAt ||
      !amount ||
      amount <= 0
    ) {
      return;
    }

    const next: BudgetClosing = {
      id: `b-${Date.now()}`,
      patientName: form.patientName.trim(),
      description: form.description.trim(),
      amount,
      closedAt: form.closedAt,
      responsible: form.responsible,
      notes: form.notes.trim() || undefined,
    };

    addBudgetClosing(next);
    setModalOpen(false);
    setForm(emptyForm());
  }

  function handleDelete(item: BudgetClosing) {
    const ok = window.confirm(
      `Remover orçamento fechado?\n\n${item.patientName} · ${formatCurrency(item.amount)}`,
    );
    if (!ok) return;
    removeBudgetClosing(item.id);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="hidden text-2xl font-semibold tracking-[-0.04em] text-slate-900 lg:block">
            Orçamentos
          </h2>
          <p className="text-sm text-slate-500 lg:mt-1">
            Ciclo do dia 20 · {formatCycleLong(cycle)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {cycle.label}
            {!ready
              ? " · Carregando…"
              : syncing
                ? " · Sincronizando…"
                : ` · ${daysLeft} dia(s) restantes`}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={openMeta}
          >
            <Target className="size-4" />
            Definir meta
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
            Orçamento fechado
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        {[
          {
            label: "Fechados no ciclo",
            value: String(cycleClosings.length),
            hint: `Meta: ${budgetMeta.targetCount}`,
            icon: Users,
            accent: "bg-blue-50 text-blue-600",
          },
          {
            label: "Valor total",
            value: formatCurrency(totalAmount),
            hint: "Soma dos orçamentos",
            icon: Wallet,
            accent: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Meta",
            value: `${progress}%`,
            hint: `${cycleClosings.length}/${budgetMeta.targetCount} orçamentos`,
            icon: Target,
            accent: "bg-amber-50 text-amber-600",
          },
          {
            label: "Bônus",
            value: formatCurrency(budgetMeta.bonusAmount),
            hint: metaHit ? "Meta batida" : "Ao bater a meta",
            icon: Gift,
            accent: metaHit
              ? "bg-emerald-50 text-emerald-600"
              : "bg-violet-50 text-violet-600",
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-5"
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
            <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">{card.hint}</p>
          </motion.div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Progresso da meta
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Contagem reinicia todo dia 20.
            </p>
          </div>
          {metaHit ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <Trophy className="size-3.5" />
              Meta batida · Bônus {formatCurrency(budgetMeta.bonusAmount)}
            </span>
          ) : (
            <span className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Faltam {Math.max(budgetMeta.targetCount - cycleClosings.length, 0)}{" "}
              para o bônus
            </span>
          )}
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              metaHit ? "bg-emerald-500" : "bg-blue-600",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {cycleClosings.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
            Nenhum orçamento fechado neste ciclo ainda.
          </div>
        ) : (
          cycleClosings.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {item.patientName}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {item.description}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-emerald-600">
                  {formatCurrency(item.amount)}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="min-w-0 text-xs text-slate-400">
                  <p>{formatDateBR(item.closedAt)}</p>
                  <p className="truncate">Responsável: {item.responsible}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="size-3.5" />
                  Apagar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {[
                  "Data",
                  "Paciente",
                  "Descrição",
                  "Valor",
                  "Responsável",
                  "Observação",
                  "Ação",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cycleClosings.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-sm text-slate-400"
                  >
                    Nenhum orçamento fechado neste ciclo ainda.
                  </td>
                </tr>
              ) : (
                cycleClosings.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-50 transition hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                      {formatDateBR(item.closedAt)}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {item.patientName}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3.5 text-slate-600">
                      {item.description}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-emerald-600">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                      {item.responsible}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3.5 text-slate-400">
                      {item.notes || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="size-3.5" />
                        Apagar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Orçamento fechado</DialogTitle>
            <DialogDescription>
              Registre o paciente que fechou orçamento neste ciclo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="patientName">Paciente</Label>
              <Input
                id="patientName"
                value={form.patientName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, patientName: e.target.value }))
                }
                placeholder="Nome do paciente"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budgetDescription">Descrição do orçamento</Label>
              <Input
                id="budgetDescription"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Ex.: Implante, aparelho, clareamento…"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="budgetAmount">Valor</Label>
                <Input
                  id="budgetAmount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder="0,00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="closedAt">Data do fechamento</Label>
                <Input
                  id="closedAt"
                  type="date"
                  value={form.closedAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, closedAt: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Responsável</Label>
              <Select
                value={form.responsible || undefined}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, responsible: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      team.length === 0
                        ? "Cadastre em Configurações"
                        : "Quem fechou"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {team.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      Cadastre em Configurações
                    </SelectItem>
                  ) : (
                    team.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="budgetNotes">Observações</Label>
              <Textarea
                id="budgetNotes"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Opcional"
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
            <Button type="button" onClick={saveClosing}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meta e bônus do ciclo</DialogTitle>
            <DialogDescription>
              Defina quantos orçamentos fechados liberam o bônus no ciclo atual.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="targetCount">Meta de orçamentos</Label>
              <Input
                id="targetCount"
                inputMode="numeric"
                value={metaForm.targetCount}
                onChange={(e) =>
                  setMetaForm((f) => ({ ...f, targetCount: e.target.value }))
                }
                placeholder="Ex.: 10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bonusAmount">Valor do bônus</Label>
              <Input
                id="bonusAmount"
                inputMode="decimal"
                value={metaForm.bonusAmount}
                onChange={(e) =>
                  setMetaForm((f) => ({ ...f, bonusAmount: e.target.value }))
                }
                placeholder="0,00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMetaOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={saveMeta}>
              Salvar meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
