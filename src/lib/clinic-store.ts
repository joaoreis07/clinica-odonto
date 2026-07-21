import { get, put } from "@vercel/blob";
import type { FinanceMovement } from "@/modules/finance/types";

export type ClinicStore = {
  movements: FinanceMovement[];
  team: string[];
  updatedAt: string;
};

export const EMPTY_STORE: ClinicStore = {
  movements: [],
  team: [],
  updatedAt: new Date(0).toISOString(),
};

const BLOB_PATHNAME = "clinic-store.json";

function normalizeStore(data: unknown): ClinicStore {
  if (!data || typeof data !== "object") return EMPTY_STORE;
  const parsed = data as Partial<ClinicStore>;
  return {
    movements: Array.isArray(parsed.movements) ? parsed.movements : [],
    team: Array.isArray(parsed.team) ? parsed.team : [],
    updatedAt:
      typeof parsed.updatedAt === "string"
        ? parsed.updatedAt
        : new Date().toISOString(),
  };
}

export async function readClinicStore(): Promise<ClinicStore> {
  try {
    const result = await get(BLOB_PATHNAME, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return EMPTY_STORE;
    }

    const text = await new Response(result.stream).text();
    return normalizeStore(JSON.parse(text));
  } catch {
    return EMPTY_STORE;
  }
}

export async function writeClinicStore(
  store: Omit<ClinicStore, "updatedAt">,
): Promise<ClinicStore> {
  const next: ClinicStore = {
    movements: store.movements,
    team: store.team,
    updatedAt: new Date().toISOString(),
  };

  await put(BLOB_PATHNAME, JSON.stringify(next), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });

  return next;
}
