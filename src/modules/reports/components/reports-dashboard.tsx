"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/modules/finance/context";
import { getToday } from "@/modules/finance/data";
import {
  formatCurrency,
  formatDateBR,
  formatLongDate,
} from "@/modules/finance/utils";
import { cn } from "@/lib/utils";
import { generateDailyReportPdf } from "../generate-daily-pdf";

export function ReportsDashboard() {
  const { movements } = useFinance();
  const [reportDate, setReportDate] = useState(getToday());

  const dayMovements = useMemo(
    () =>
      [...movements]
        .filter((m) => m.date === reportDate)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [movements, reportDate],
  );

  const entradas = dayMovements.filter((m) => m.type === "entrada");
  const saidas = dayMovements.filter((m) => m.type === "saida");
  const totalEntradas = entradas.reduce((s, m) => s + m.amount, 0);
  const totalSaidas = saidas.reduce((s, m) => s + m.amount, 0);
  const saldo = totalEntradas - totalSaidas;

  function handleGeneratePdf() {
    generateDailyReportPdf(reportDate, movements);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-900">
            Relatórios
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Gere o PDF do fluxo financeiro do dia.
          </p>
        </div>
        <Button type="button" onClick={handleGeneratePdf}>
          <FileDown className="size-4" />
          Gerar PDF do Dia
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-1.5">
            <Label htmlFor="report-date" className="text-xs text-slate-500">
              Data do relatório
            </Label>
            <Input
              id="report-date"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="h-10 w-[180px]"
            />
          </div>
          <p className="text-sm capitalize text-slate-500">
            {formatLongDate(reportDate)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Entradas",
            value: formatCurrency(totalEntradas),
            hint: `${entradas.length} registros`,
            icon: ArrowDownLeft,
            accent: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Saídas",
            value: formatCurrency(totalSaidas),
            hint: `${saidas.length} registros`,
            icon: ArrowUpRight,
            accent: "bg-rose-50 text-rose-600",
          },
          {
            label: "Saldo do Dia",
            value: formatCurrency(saldo),
            hint: "Entradas − saídas",
            icon: TrendingUp,
            accent: "bg-blue-50 text-blue-600",
          },
          {
            label: "Movimentações",
            value: String(dayMovements.length),
            hint: formatDateBR(reportDate),
            icon: Wallet,
            accent: "bg-amber-50 text-amber-600",
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-slate-500">{card.label}</p>
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-xl",
                  card.accent,
                )}
              >
                <card.icon className="size-4" />
              </span>
            </div>
            <p className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
          </motion.div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Movimentações do dia
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={handleGeneratePdf}>
            <FileDown className="size-4" />
            Baixar PDF
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {[
                  "Horário",
                  "Tipo",
                  "Nome",
                  "Descrição",
                  "Pagamento",
                  "Valor",
                  "Responsável",
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
              {dayMovements.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-14 text-center text-sm text-slate-400"
                  >
                    Nenhuma movimentação neste dia. Registre no Financeiro para
                    gerar o relatório.
                  </td>
                </tr>
              ) : (
                dayMovements.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-slate-50 transition hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                      {m.time}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
                          m.type === "entrada"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700",
                        )}
                      >
                        {m.type === "entrada" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {m.personName}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3.5 text-slate-600">
                      {m.description}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{m.paymentMethod}</td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-4 py-3.5 font-semibold tabular-nums",
                        m.type === "entrada" ? "text-emerald-600" : "text-rose-600",
                      )}
                    >
                      {m.type === "entrada" ? "+" : "−"}
                      {formatCurrency(m.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                      {m.responsible}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
