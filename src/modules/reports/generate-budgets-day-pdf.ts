import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { BudgetClosing } from "@/modules/budgets/types";
import {
  formatCurrency,
  formatDateBR,
  formatLongDate,
} from "@/modules/finance/utils";

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function generateBudgetsDayPdf(
  dateISO: string,
  closings: BudgetClosing[],
) {
  const dayClosings = [...closings]
    .filter((c) => c.status === "fechado" && c.closedAt === dateISO)
    .sort((a, b) => a.patientName.localeCompare(b.patientName, "pt-BR"));

  const total = dayClosings.reduce((s, c) => s + c.amount, 0);
  const procedures = dayClosings.reduce((s, c) => s + c.items.length, 0);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const marginX = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Clínica Odonto", marginX, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Relatório de Orçamentos do Dia", marginX, 26);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(capitalize(formatLongDate(dateISO)), marginX, 33);
  doc.text(`Gerado em: ${formatDateBR(dateISO)}`, marginX, 39);
  doc.setTextColor(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumo", marginX, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Orçamentos fechados: ${dayClosings.length}`, marginX, 58);
  doc.text(`Procedimentos: ${procedures}`, marginX, 64);
  doc.text(`Total: ${formatCurrency(total)}`, marginX, 70);

  autoTable(doc, {
    startY: 80,
    head: [["Paciente", "Procedimentos", "Valor", "Responsável"]],
    body:
      dayClosings.length === 0
        ? [["—", "Sem orçamentos fechados neste dia", "—", "—"]]
        : dayClosings.map((c) => [
            c.patientName,
            c.items.length > 0
              ? c.items.map((i) => i.description).join("; ")
              : c.description,
            formatCurrency(c.amount),
            c.responsible,
          ]),
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: {
      fillColor: [8, 62, 170],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 2: { halign: "right" } },
    margin: { left: marginX, right: marginX },
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 100;

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    "Documento interno — uso exclusivo da Clínica Odonto",
    marginX,
    Math.min(finalY + 12, 285),
  );

  doc.save(`relatorio-orcamentos-${dateISO}.pdf`);
}
