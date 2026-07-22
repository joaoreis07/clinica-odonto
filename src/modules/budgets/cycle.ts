import {
  differenceInCalendarDays,
  format,
  isWithinInterval,
  parseISO,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { BudgetClosing } from "./types";

export type CycleRange = {
  start: Date;
  endExclusive: Date;
  startISO: string;
  endISO: string;
  label: string;
};

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Ciclo mensal: do dia 20 até o dia 19 seguinte (fecha no próximo dia 20). */
export function getBudgetCycle(ref: Date = new Date()): CycleRange {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const day = ref.getDate();

  const start =
    day >= 20 ? new Date(year, month, 20) : new Date(year, month - 1, 20);
  const endExclusive = new Date(
    start.getFullYear(),
    start.getMonth() + 1,
    20,
  );
  const endInclusive = subDays(endExclusive, 1);

  return {
    start,
    endExclusive,
    startISO: toISODate(start),
    endISO: toISODate(endInclusive),
    label: `${format(start, "dd/MM/yyyy")} → ${format(endExclusive, "dd/MM/yyyy")}`,
  };
}

export function isInBudgetCycle(isoDate: string, cycle: CycleRange): boolean {
  const date = parseISO(isoDate);
  return isWithinInterval(date, {
    start: cycle.start,
    end: subDays(cycle.endExclusive, 1),
  });
}

export function filterCycleClosings(
  closings: BudgetClosing[],
  cycle: CycleRange,
): BudgetClosing[] {
  return [...closings]
    .filter((item) => isInBudgetCycle(item.closedAt, cycle))
    .sort((a, b) => {
      const byDate = b.closedAt.localeCompare(a.closedAt);
      if (byDate !== 0) return byDate;
      return b.id.localeCompare(a.id);
    });
}

export function daysLeftInCycle(cycle: CycleRange, ref: Date = new Date()): number {
  const left = differenceInCalendarDays(cycle.endExclusive, ref);
  return Math.max(0, left);
}

export function formatCycleLong(cycle: CycleRange): string {
  return `${format(cycle.start, "d 'de' MMMM", { locale: ptBR })} → ${format(
    cycle.endExclusive,
    "d 'de' MMMM",
    { locale: ptBR },
  )}`;
}
