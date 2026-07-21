import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FinanceMovement } from "@/modules/finance/types";
import { formatCurrency, formatDateBR, formatLongDate } from "@/modules/finance/utils";

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function generateDailyReportPdf(
  dateISO: string,
  movements: FinanceMovement[],
) {
  const dayMovements = [...movements]
    .filter((m) => m.date === dateISO)
    .sort((a, b) => a.time.localeCompare(b.time));

  const entradas = dayMovements.filter((m) => m.type === "entrada");
  const saidas = dayMovements.filter((m) => m.type === "saida");
  const totalEntradas = entradas.reduce((s, m) => s + m.amount, 0);
  const totalSaidas = saidas.reduce((s, m) => s + m.amount, 0);
  const saldo = totalEntradas - totalSaidas;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const marginX = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Clínica Odonto", marginX, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Relatório Financeiro do Dia", marginX, 26);

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
  const summary = [
    `Movimentações: ${dayMovements.length}`,
    `Entradas: ${entradas.length} · ${formatCurrency(totalEntradas)}`,
    `Saídas: ${saidas.length} · ${formatCurrency(totalSaidas)}`,
    `Saldo do dia: ${formatCurrency(saldo)}`,
  ];
  summary.forEach((line, i) => {
    doc.text(line, marginX, 58 + i * 6);
  });

  autoTable(doc, {
    startY: 86,
    head: [
      [
        "Horário",
        "Tipo",
        "Nome",
        "Descrição",
        "Pagamento",
        "Valor",
        "Quem recebeu",
      ],
    ],
    body:
      dayMovements.length === 0
        ? [["—", "—", "Sem movimentações neste dia", "—", "—", "—", "—"]]
        : dayMovements.map((m) => [
            m.time,
            m.type === "entrada" ? "Entrada" : "Saída",
            m.personName,
            m.description,
            m.paymentMethod,
            `${m.type === "entrada" ? "+" : "-"}${formatCurrency(m.amount)}`,
            m.responsible,
          ]),
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
    },
    headStyles: {
      fillColor: [8, 62, 170],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      5: { halign: "right" },
    },
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

  const fileName = `relatorio-financeiro-${dateISO}.pdf`;
  doc.save(fileName);
}
