"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/modules/finance/context";

export function SettingsDashboard() {
  const { team, addResponsible, removeResponsible } = useFinance();
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const ok = addResponsible(name);
    if (!ok) {
      setFeedback(
        name.trim()
          ? "Este responsável já está cadastrado."
          : "Informe o nome do responsável.",
      );
      return;
    }
    setName("");
    setFeedback("Responsável cadastrado.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-900">
          Configurações
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Dados da clínica e cadastro dos responsáveis pelo caixa.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Identidade
          </p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">
            Logo da clínica
          </h3>
          <div className="mt-5 flex flex-col items-center gap-4">
            <div className="relative size-40 overflow-hidden rounded-full border border-slate-100 bg-slate-50 shadow-sm">
              <Image
                src="/logo-clinica-odonto.png"
                alt="Logo Clínica Odonto"
                fill
                className="object-cover"
                sizes="160px"
                priority
              />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold tracking-[-0.03em] text-slate-900">
                Clínica Odonto
              </p>
              <p className="mt-1 text-xs text-slate-500">Sistema interno</p>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Equipe
              </p>
              <h3 className="mt-1 text-sm font-semibold text-slate-900">
                Cadastro de responsáveis
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Pessoas autorizadas a registrar entradas e saídas.
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <UserRound className="size-4" />
            </span>
          </div>

          <form
            onSubmit={handleAdd}
            className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="responsible-name">Nome do responsável</Label>
              <Input
                id="responsible-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFeedback(null);
                }}
                placeholder="Ex.: Ana Paula"
              />
            </div>
            <Button type="submit" className="sm:mb-0">
              <Plus className="size-4" />
              Adicionar
            </Button>
          </form>

          {feedback ? (
            <p
              className={`mt-3 text-sm ${
                feedback.includes("cadastrado.") && !feedback.includes("já")
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {feedback}
            </p>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody>
                {team.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-12 text-center text-sm text-slate-400"
                    >
                      Nenhum responsável cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  team.map((person) => (
                    <tr
                      key={person}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-4 py-3.5 font-medium text-slate-900">
                        {person}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => removeResponsible(person)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                        >
                          <Trash2 className="size-3.5" />
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
