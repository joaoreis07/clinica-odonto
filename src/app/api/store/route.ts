import { NextResponse } from "next/server";
import { readClinicStore, writeClinicStore } from "@/lib/clinic-store";
import type { FinanceMovement } from "@/modules/finance/types";

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
      team?: string[];
    };

    const store = await writeClinicStore({
      movements: Array.isArray(body.movements) ? body.movements : [],
      team: Array.isArray(body.team) ? body.team : [],
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
