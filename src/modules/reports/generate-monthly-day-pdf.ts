import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { MonthlyPayment } from "@/modules/finance/monthly-types";
import {
  formatCurrency,
  formatDateBR,
  formatLongDate,
} from "@/modules/finance/utils";

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatMonthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-");
  const months = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  const idx = Number(m) - 1;
  return `${months[idx] ?? m}/${y}`;
}

export function generateMonthlyFinanceDayPdf(
  dateISO: string,
  payments: MonthlyPayment[],
) {
  const dayPayments = [...payments]
    .filter((p) => p.paidAt === dateISO)
    .sort((a, b) => a.patientName.localeCompare(b.patientName, "pt-BR"));

  const total = dayPayments.reduce((s, p) => s + p.amount, 0);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const marginX = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Clínica Odonto", marginX, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Relatório Financeiro — Mensalidades do Dia", marginX, 26);

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
  doc.text(`Pagamentos: ${dayPayments.length}`, marginX, 58);
  doc.text(`Total recebido: ${formatCurrency(total)}`, marginX, 64);

  autoTable(doc, {
    startY: 74,
    head: [["Paciente", "Mês ref.", "Pagamento", "Valor", "Responsável"]],
    body:
      dayPayments.length === 0
        ? [["—", "—", "Sem mensalidades neste dia", "—", "—"]]
        : dayPayments.map((p) => [
            p.patientName,
            formatMonthLabel(p.referenceMonth),
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

  doc.save(`relatorio-financeiro-mensalidades-${dateISO}.pdf`);
}
