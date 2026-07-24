"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  ClipboardList,
  FileDown,
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
import { generateBudgetsCyclePdf } from "@/modules/reports/generate-budgets-cycle-pdf";
import {
  daysLeftInCycle,
  filterCycleClosings,
  formatCycleLong,
  formatCycleOption,
  getBudgetCycle,
  isCurrentCycle,
  listAvailableCycles,
} from "../cycle";
import {
  budgetItemsSummary,
  budgetItemsTotal,
  type BudgetClosing,
  type BudgetItem,
} from "../types";

type CreateForm = {
  patientName: string;
  responsible: string;
  notes: string;
};

type ItemForm = {
  description: string;
  amount: string;
};

const emptyCreate = (): CreateForm => ({
  patientName: "",
  responsible: "",
  notes: "",
});

const emptyItem = (): ItemForm => ({
  description: "",
  amount: "",
});

export function BudgetsDashboard() {
  const {
    budgetClosings,
    addBudgetClosing,
    updateBudgetClosing,
    removeBudgetClosing,
    budgetMeta,
    updateBudgetMeta,
    team,
    ready,
    syncing,
  } = useFinance();

  const availableCycles = useMemo(
    () => listAvailableCycles(budgetClosings, new Date()),
    [budgetClosings],
  );
  const currentCycle = useMemo(() => getBudgetCycle(new Date()), []);
  const [selectedCycleStart, setSelectedCycleStart] = useState(
    currentCycle.startISO,
  );

  const cycle = useMemo(() => {
    return (
      availableCycles.find((item) => item.startISO === selectedCycleStart) ??
      currentCycle
    );
  }, [availableCycles, selectedCycleStart, currentCycle]);

  const viewingCurrent = isCurrentCycle(cycle);
  const closedInCycle = useMemo(
    () => filterCycleClosings(budgetClosings, cycle),
    [budgetClosings, cycle],
  );
  const drafts = useMemo(
    () =>
      budgetClosings
        .filter((item) => item.status === "rascunho")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [budgetClosings],
  );

  const totalAmount = closedInCycle.reduce((sum, item) => sum + item.amount, 0);
  const targetRevenue = Math.max(budgetMeta.targetRevenue, 0.01);
  const progress = Math.min(
    100,
    Math.round((totalAmount / targetRevenue) * 100),
  );
  const metaHit = totalAmount >= budgetMeta.targetRevenue;
  const remainingRevenue = Math.max(budgetMeta.targetRevenue - totalAmount, 0);
  const daysLeft = daysLeftInCycle(cycle);

  const [createOpen, setCreateOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(false);
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItem);
  const [metaForm, setMetaForm] = useState({
    targetRevenue: String(budgetMeta.targetRevenue || ""),
    bonusAmount: String(budgetMeta.bonusAmount || ""),
  });

  const activeBudget = useMemo(
    () => budgetClosings.find((item) => item.id === activeBudgetId) ?? null,
    [budgetClosings, activeBudgetId],
  );

  function openMeta() {
    setMetaForm({
      targetRevenue: String(budgetMeta.targetRevenue || ""),
      bonusAmount: String(budgetMeta.bonusAmount || ""),
    });
    setMetaOpen(true);
  }

  function saveMeta() {
    const targetRevenueValue = Number(
      metaForm.targetRevenue.replace(",", ".").replace(/[^\d.]/g, ""),
    );
    const bonusAmount = Number(
      metaForm.bonusAmount.replace(",", ".").replace(/[^\d.]/g, ""),
    );
    if (!targetRevenueValue || targetRevenueValue <= 0) return;
    updateBudgetMeta({
      targetRevenue: targetRevenueValue,
      bonusAmount: Number.isFinite(bonusAmount) ? bonusAmount : 0,
    });
    setMetaOpen(false);
  }

  function createDraft() {
    if (!createForm.patientName.trim() || !createForm.responsible) return;

    const today = getToday();
    const next: BudgetClosing = {
      id: `b-${Date.now()}`,
      patientName: createForm.patientName.trim(),
      description: "Sem procedimentos",
      amount: 0,
      closedAt: "",
      responsible: createForm.responsible,
      notes: createForm.notes.trim() || undefined,
      status: "rascunho",
      items: [],
      createdAt: today,
    };

    addBudgetClosing(next);
    setCreateOpen(false);
    setCreateForm(emptyCreate);
    setActiveBudgetId(next.id);
    setItemForm(emptyItem);
  }

  function addProcedure() {
    if (!activeBudget || activeBudget.status !== "rascunho") return;
    const amount = Number(
      itemForm.amount.replace(",", ".").replace(/[^\d.]/g, ""),
    );
    const description = itemForm.description.trim();
    if (!description || !amount || amount <= 0) return;

    const item: BudgetItem = {
      id: `i-${Date.now()}`,
      description,
      amount,
    };

    updateBudgetClosing(activeBudget.id, (current) => {
      const items = [...current.items, item];
      return {
        ...current,
        items,
        amount: budgetItemsTotal(items),
        description: budgetItemsSummary(items),
      };
    });
    setItemForm(emptyItem);
  }

  function removeProcedure(itemId: string) {
    if (!activeBudget || activeBudget.status !== "rascunho") return;
    updateBudgetClosing(activeBudget.id, (current) => {
      const items = current.items.filter((item) => item.id !== itemId);
      return {
        ...current,
        items,
        amount: budgetItemsTotal(items),
        description: budgetItemsSummary(items),
      };
    });
  }

  function finalizeBudget() {
    if (!activeBudget || activeBudget.status !== "rascunho") return;
    if (activeBudget.items.length === 0) {
      window.alert("Adicione pelo menos um procedimento antes de fechar.");
      return;
    }

    const ok = window.confirm(
      `Fechar orçamento de ${activeBudget.patientName}?\n\nTotal: ${formatCurrency(activeBudget.amount)}`,
    );
    if (!ok) return;

    updateBudgetClosing(activeBudget.id, {
      status: "fechado",
      closedAt: getToday(),
      amount: budgetItemsTotal(activeBudget.items),
      description: budgetItemsSummary(activeBudget.items),
    });
    setActiveBudgetId(null);
  }

  function handleDelete(item: BudgetClosing) {
    const label =
      item.status === "rascunho" ? "rascunho" : "orçamento fechado";
    const ok = window.confirm(
      `Remover ${label}?\n\n${item.patientName} · ${formatCurrency(item.amount)}`,
    );
    if (!ok) return;
    if (activeBudgetId === item.id) setActiveBudgetId(null);
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
            {viewingCurrent ? "Ciclo atual" : "Ciclo selecionado"}:{" "}
            {formatCycleLong(cycle)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Monte por paciente e feche o orçamento final
            {!ready
              ? " · Carregando…"
              : syncing
                ? " · Sincronizando…"
                : viewingCurrent
                  ? ` · ${daysLeft} dia(s) restantes`
                  : " · Ciclo encerrado"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => generateBudgetsCyclePdf(cycle, closedInCycle)}
          >
            <FileDown className="size-4" />
            Relatório de orçamentos
          </Button>
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
              setCreateForm(emptyCreate());
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo orçamento
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Ver ciclo</p>
            <p className="text-xs text-slate-500">
              Meta e fechados do ciclo selecionado.
            </p>
          </div>
          <Select
            value={selectedCycleStart}
            onValueChange={setSelectedCycleStart}
          >
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue placeholder="Selecione o ciclo" />
            </SelectTrigger>
            <SelectContent>
              {availableCycles.map((item) => (
                <SelectItem key={item.startISO} value={item.startISO}>
                  {formatCycleOption(item)}
                  {item.startISO === currentCycle.startISO ? " · atual" : ""}
                  {" · "}
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
        {[
          {
            label: "Fechados no ciclo",
            value: String(closedInCycle.length),
            hint: `${drafts.length} em montagem`,
            icon: Users,
            accent: "bg-blue-50 text-blue-600",
          },
          {
            label: "Faturamento",
            value: formatCurrency(totalAmount),
            hint: `Meta: ${formatCurrency(budgetMeta.targetRevenue)}`,
            icon: Wallet,
            accent: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Meta",
            value: `${progress}%`,
            hint: `${formatCurrency(totalAmount)} / ${formatCurrency(budgetMeta.targetRevenue)}`,
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
              Progresso da meta de faturamento
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Conta apenas orçamentos fechados no ciclo.
            </p>
          </div>
          {metaHit ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <Trophy className="size-3.5" />
              Meta batida · Bônus {formatCurrency(budgetMeta.bonusAmount)}
            </span>
          ) : viewingCurrent ? (
            <span className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Faltam {formatCurrency(remainingRevenue)} para o bônus
            </span>
          ) : (
            <span className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Ciclo encerrado
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

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Em montagem
          </h3>
          <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            {drafts.length}
          </span>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
            Nenhum orçamento em montagem. Crie um e vá adicionando os
            procedimentos.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {drafts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveBudgetId(item.id);
                  setItemForm(emptyItem());
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {item.patientName}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {item.description}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.items.length} procedimento(s) · {item.responsible}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-blue-600">
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Fechados no ciclo
          </h3>
          <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            {closedInCycle.length}
          </span>
        </div>

        <div className="space-y-3 md:hidden">
          {closedInCycle.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400 shadow-sm">
              Nenhum orçamento fechado neste ciclo.
            </div>
          ) : (
            closedInCycle.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setActiveBudgetId(item.id)}
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
                </button>
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
                    "Procedimentos",
                    "Valor",
                    "Responsável",
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
                {closedInCycle.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-16 text-center text-sm text-slate-400"
                    >
                      Nenhum orçamento fechado neste ciclo.
                    </td>
                  </tr>
                ) : (
                  closedInCycle.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-50 transition hover:bg-slate-50/80"
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {formatDateBR(item.closedAt)}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        <button
                          type="button"
                          className="text-left hover:text-blue-700"
                          onClick={() => setActiveBudgetId(item.id)}
                        >
                          {item.patientName}
                        </button>
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-3.5 text-slate-600">
                        {item.description}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-emerald-600">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {item.responsible}
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
      </section>

      {/* Criar rascunho */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo orçamento</DialogTitle>
            <DialogDescription>
              Crie o orçamento do paciente e depois adicione os procedimentos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="patientName">Paciente</Label>
              <Input
                id="patientName"
                value={createForm.patientName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, patientName: e.target.value }))
                }
                placeholder="Nome do paciente"
              />
            </div>
            <div className="grid gap-2">
              <Label>Responsável</Label>
              <Select
                value={createForm.responsible || undefined}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, responsible: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      team.length === 0
                        ? "Cadastre em Configurações"
                        : "Quem está montando"
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
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={createDraft}>
              Começar montagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Montagem / detalhe */}
      <Dialog
        open={!!activeBudget}
        onOpenChange={(open) => {
          if (!open) setActiveBudgetId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {activeBudget ? (
            <>
              <DialogHeader>
                <DialogTitle>{activeBudget.patientName}</DialogTitle>
                <DialogDescription>
                  {activeBudget.status === "rascunho"
                    ? "Adicione os procedimentos e feche o orçamento no final."
                    : "Orçamento fechado — visualização organizada."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-1">
                <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 sm:grid-cols-2">
                  <p>
                    <span className="text-slate-400">Responsável: </span>
                    {activeBudget.responsible || "—"}
                  </p>
                  <p>
                    <span className="text-slate-400">Status: </span>
                    {activeBudget.status === "rascunho"
                      ? "Em montagem"
                      : `Fechado em ${formatDateBR(activeBudget.closedAt)}`}
                  </p>
                  {activeBudget.notes ? (
                    <p className="sm:col-span-2">
                      <span className="text-slate-400">Obs.: </span>
                      {activeBudget.notes}
                    </p>
                  ) : null}
                </div>

                {activeBudget.status === "rascunho" ? (
                  <div className="grid gap-3 rounded-2xl border border-slate-200 p-3 sm:grid-cols-[1fr_140px_auto]">
                    <div className="grid gap-1.5">
                      <Label htmlFor="procDesc">Procedimento</Label>
                      <Input
                        id="procDesc"
                        value={itemForm.description}
                        onChange={(e) =>
                          setItemForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Ex.: Restauração, extração…"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="procAmount">Valor</Label>
                      <Input
                        id="procAmount"
                        inputMode="decimal"
                        value={itemForm.amount}
                        onChange={(e) =>
                          setItemForm((f) => ({ ...f, amount: e.target.value }))
                        }
                        placeholder="0,00"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        className="w-full"
                        onClick={addProcedure}
                      >
                        <Plus className="size-4" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Procedimentos
                    </p>
                    <p className="text-sm font-semibold text-emerald-600">
                      Total {formatCurrency(activeBudget.amount)}
                    </p>
                  </div>
                  {activeBudget.items.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-slate-400">
                      Nenhum procedimento ainda.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {activeBudget.items.map((item, index) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-3 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-400">
                              {String(index + 1).padStart(2, "0")}
                            </p>
                            <p className="font-medium text-slate-900">
                              {item.description}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <p className="text-sm font-semibold text-emerald-600">
                              {formatCurrency(item.amount)}
                            </p>
                            {activeBudget.status === "rascunho" ? (
                              <button
                                type="button"
                                onClick={() => removeProcedure(item.id)}
                                className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                                title="Remover"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => handleDelete(activeBudget)}
                >
                  <Trash2 className="size-4" />
                  Apagar
                </Button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveBudgetId(null)}
                  >
                    Fechar
                  </Button>
                  {activeBudget.status === "rascunho" ? (
                    <Button type="button" onClick={finalizeBudget}>
                      <CheckCircle2 className="size-4" />
                      Fechar orçamento final
                    </Button>
                  ) : null}
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meta e bônus do ciclo</DialogTitle>
            <DialogDescription>
              Defina a meta de faturamento em R$ para liberar o bônus no ciclo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label htmlFor="targetRevenue">Meta de faturamento (R$)</Label>
              <Input
                id="targetRevenue"
                inputMode="decimal"
                value={metaForm.targetRevenue}
                onChange={(e) =>
                  setMetaForm((f) => ({ ...f, targetRevenue: e.target.value }))
                }
                placeholder="Ex.: 50000"
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
