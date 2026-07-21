"use client";

import { useState } from "react";
import {
  Bell,
  CalendarDays,
  FileBarChart2,
  LayoutDashboard,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { FinanceDashboard } from "@/modules/finance/components/finance-dashboard";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: LayoutDashboard, label: "Visão geral" },
  { icon: CalendarDays, label: "Agenda" },
  { icon: Users, label: "Pacientes" },
  { icon: Wallet, label: "Financeiro" },
  { icon: FileBarChart2, label: "Relatórios" },
  { icon: Settings, label: "Configurações" },
] as const;

export function AppShell() {
  const [active, setActive] = useState<(typeof NAV)[number]["label"]>("Financeiro");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 hidden w-64 border-r border-slate-800 bg-slate-950 px-4 py-6 text-slate-400 lg:block">
        <div className="px-3">
          <p className="text-lg font-semibold tracking-[-0.04em] text-white">
            Clínica Odonto
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Sistema interno</p>
        </div>
        <p className="mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
          Menu principal
        </p>
        <nav className="mt-3 grid gap-1">
          {NAV.map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setActive(label)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                active === label
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                  : "hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:h-20 sm:px-5 lg:px-9">
          <div>
            <p className="text-xs text-slate-400 lg:hidden">Clínica Odonto</p>
            <h1 className="text-lg font-semibold tracking-[-0.035em] sm:text-xl">
              {active}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex gap-1 overflow-x-auto lg:hidden">
              {NAV.filter((n) => n.label === "Financeiro" || n.label === active).map(
                ({ label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActive(label)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                      active === label
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
            <button
              className="relative grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"
              type="button"
            >
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-blue-600" />
            </button>
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-sky-200 to-blue-300 text-xs font-semibold text-blue-950">
              CO
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-5 lg:p-9">
          {active === "Financeiro" ? (
            <FinanceDashboard />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-semibold text-slate-900">{active}</p>
              <p className="mt-2 text-sm text-slate-500">
                Módulo em preparação. Use o menu para abrir o Financeiro.
              </p>
              <button
                type="button"
                onClick={() => setActive("Financeiro")}
                className="mt-6 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20"
              >
                Ir para Financeiro
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
