import { NextResponse } from "next/server";
import { readClinicStore, writeClinicStore } from "@/lib/clinic-store";
import type { FinanceMovement } from "@/modules/finance/types";
import type { MonthlyPayment } from "@/modules/finance/monthly-types";
import type { BudgetClosing, BudgetMeta } from "@/modules/budgets/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readClinicStore();
  return NextResponse.json(store);
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      movements?: FinanceMovement[];
      monthlyPayments?: MonthlyPayment[];
      team?: string[];
      budgetClosings?: BudgetClosing[];
      budgetMeta?: BudgetMeta;
    };

    const current = await readClinicStore();

    const store = await writeClinicStore({
      movements: Array.isArray(body.movements)
        ? body.movements
        : current.movements,
      monthlyPayments: Array.isArray(body.monthlyPayments)
        ? body.monthlyPayments
        : current.monthlyPayments,
      team: Array.isArray(body.team) ? body.team : current.team,
      budgetClosings: Array.isArray(body.budgetClosings)
        ? body.budgetClosings
        : current.budgetClosings,
      budgetMeta: body.budgetMeta ?? current.budgetMeta,
    });

    return NextResponse.json(store);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Não foi possível salvar os dados." },
      { status: 500 },
    );
  }
}
