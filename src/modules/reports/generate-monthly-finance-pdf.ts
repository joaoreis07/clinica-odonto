import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MonthlyPayment } from "@/modules/finance/monthly-types";
import {
  formatCurrency,
  formatDateBR,
} from "@/modules/finance/utils";

function formatMonthTitle(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  const label = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Relatório mensal de quem pagou (mês civil, sem ciclo dia 20). */
export function generateMonthlyFinancePdf(
  referenceMonth: string,
  payments: MonthlyPayment[],
) {
  const monthPayments = [...payments]
    .filter((p) => p.referenceMonth === referenceMonth)
    .sort((a, b) => {
      const byDate = a.paidAt.localeCompare(b.paidAt);
      if (byDate !== 0) return byDate;
      return a.patientName.localeCompare(b.patientName, "pt-BR");
    });

  const total = monthPayments.reduce((s, p) => s + p.amount, 0);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const marginX = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Clínica Odonto", marginX, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Relatório Financeiro — Quem pagou no mês", marginX, 26);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(formatMonthTitle(referenceMonth), marginX, 33);
  doc.setTextColor(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumo", marginX, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Pacientes que pagaram: ${monthPayments.length}`, marginX, 54);
  doc.text(`Total recebido: ${formatCurrency(total)}`, marginX, 60);

  autoTable(doc, {
    startY: 70,
    head: [["Paciente", "Pago em", "Pagamento", "Valor", "Responsável"]],
    body:
      monthPayments.length === 0
        ? [["—", "—", "Ninguém pagou neste mês", "—", "—"]]
        : monthPayments.map((p) => [
            p.patientName,
            formatDateBR(p.paidAt),
            p.paymentMethod,
            formatCurrency(p.amount),
            p.responsible,
          ]),
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: {
      fillColor: [8, 62, 170],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 3: { halign: "right" } },
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

  doc.save(`relatorio-mensalidades-${referenceMonth}.pdf`);
}
