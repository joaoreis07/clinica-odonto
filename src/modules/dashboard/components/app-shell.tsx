"use client";

import { useState } from "react";
import Image from "next/image";
import { Bell, FileBarChart2, Settings, Wallet } from "lucide-react";
import { FinanceDashboard } from "@/modules/finance/components/finance-dashboard";
import { FinanceProvider } from "@/modules/finance/context";
import { ReportsDashboard } from "@/modules/reports/components/reports-dashboard";
import { SettingsDashboard } from "@/modules/settings/components/settings-dashboard";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: Wallet, label: "Financeiro" },
  { icon: FileBarChart2, label: "Relatórios" },
  { icon: Settings, label: "Configurações" },
] as const;

export function AppShell() {
  const [active, setActive] = useState<(typeof NAV)[number]["label"]>("Financeiro");

  return (
    <FinanceProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
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
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:h-20 sm:px-5 lg:px-9">
            <div className="flex items-center gap-3">
              <div className="relative size-9 overflow-hidden rounded-full border border-slate-200 lg:hidden">
                <Image
                  src="/logo-clinica-odonto.png"
                  alt="Clínica Odonto"
                  fill
                  className="object-cover"
                  sizes="36px"
                />
              </div>
              <div>
                <p className="text-xs text-slate-400 lg:hidden">Clínica Odonto</p>
                <h1 className="text-lg font-semibold tracking-[-0.035em] sm:text-xl">
                  {active}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex max-w-[50vw] gap-1 overflow-x-auto lg:hidden">
                {NAV.map(({ label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActive(label)}
                    className={cn(
                      "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                      active === label
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="relative grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500"
                type="button"
              >
                <Bell className="size-4" />
              </button>
            </div>
          </header>

          <main className="mx-auto max-w-7xl p-4 sm:p-5 lg:p-9">
            {active === "Financeiro" ? (
              <FinanceDashboard />
            ) : active === "Relatórios" ? (
              <ReportsDashboard />
            ) : (
              <SettingsDashboard />
            )}
          </main>
        </div>
      </div>
    </FinanceProvider>
  );
}
