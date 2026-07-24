"use client";

import { useState } from "react";
import Image from "next/image";
import {
  BookOpen,
  ClipboardCheck,
  Settings,
  Wallet,
} from "lucide-react";
import { BudgetsDashboard } from "@/modules/budgets/components/budgets-dashboard";
import { FinanceDashboard } from "@/modules/finance/components/finance-dashboard";
import { MonthlyFinanceDashboard } from "@/modules/finance/components/monthly-finance-dashboard";
import { FinanceProvider } from "@/modules/finance/context";
import { SettingsDashboard } from "@/modules/settings/components/settings-dashboard";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: BookOpen, label: "Diário" },
  { icon: Wallet, label: "Financeiro" },
  { icon: ClipboardCheck, label: "Orçamentos" },
  { icon: Settings, label: "Configurações" },
] as const;

export function AppShell() {
  const [active, setActive] = useState<(typeof NAV)[number]["label"]>("Diário");

  return (
    <FinanceProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 lg:pb-0">
        <aside className="fixed inset-y-0 hidden w-64 border-r border-slate-800 bg-slate-950 px-4 py-6 text-slate-400 lg:block">
          <div className="flex items-center gap-3 px-2">
            <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white">
              <Image
                src="/logo-clinica-odonto.png"
                alt="Clínica Odonto"
                fill
                className="object-cover"
                sizes="44px"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[-0.03em] text-white">
                Clínica Odonto
              </p>
              <p className="text-[11px] text-slate-500">Sistema interno</p>
            </div>
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
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex h-14 items-center justify-between px-4 sm:h-16 sm:px-5 lg:h-20 lg:px-9">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-slate-200 lg:hidden">
                  <Image
                    src="/logo-clinica-odonto.png"
                    alt="Clínica Odonto"
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-[-0.03em] text-slate-900 lg:hidden">
                    Clínica Odonto
                  </p>
                  <h1 className="hidden text-xl font-semibold tracking-[-0.035em] lg:block">
                    {active}
                  </h1>
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl p-4 sm:p-5 lg:p-9">
            {active === "Diário" ? (
              <FinanceDashboard />
            ) : active === "Financeiro" ? (
              <MonthlyFinanceDashboard />
            ) : active === "Orçamentos" ? (
              <BudgetsDashboard />
            ) : (
              <SettingsDashboard />
            )}
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
            {NAV.map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setActive(label)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition sm:text-[11px]",
                  active === label
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-500",
                )}
              >
                <Icon className="size-5" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </FinanceProvider>
  );
}
