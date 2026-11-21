import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfSection {
  title: string;
  note?: string;
  head: string[];
  body: (string | number)[][];
}

export interface PdfReportInput {
  title: string;
  subtitle: string;
  generatedFor: string;
  kpis: { label: string; value: string }[];
  summary?: { text: string; source: string };
  trend?: { label: string; actual: number; expected: number }[];
  sections: PdfSection[];
  disclaimer: string;
}

const NAVY: [number, number, number] = [11, 27, 51];
const SOLAR: [number, number, number] = [240, 138, 12];
const MUTED: [number, number, number] = [100, 116, 139];

/** Build a branded PDF report entirely client-side. */
export function buildPdfReport(input: PdfReportInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 92, "F");
  doc.setFillColor(...SOLAR);
  doc.circle(M + 10, 36, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("PanelMorrow", M + 26, 41);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(180, 195, 220);
  doc.text("Prioritize solar maintenance by lost output", M + 26, 54);
  doc.setFontSize(8);
  doc.text(input.generatedFor, W - M, 41, { align: "right" });
  doc.text(`Generated ${new Date().toLocaleString("en-GB")}`, W - M, 54, { align: "right" });

  let y = 124;
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(input.title, M, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(input.subtitle, M, y);
  y += 22;

  // KPI tiles
  const cols = 3;
  const gap = 10;
  const tileW = (W - M * 2 - gap * (cols - 1)) / cols;
  input.kpis.forEach((k, i) => {
    const cx = M + (i % cols) * (tileW + gap);
    const cy = y + Math.floor(i / cols) * 54;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cx, cy, tileW, 46, 4, 4, "FD");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(k.label, cx + 10, cy + 16);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(k.value, cx + 10, cy + 35);
    doc.setFont("helvetica", "normal");
  });
  y += Math.ceil(input.kpis.length / cols) * 54 + 10;

  // Summary
  if (input.summary) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text("Executive summary", M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(124, 58, 237);
    doc.text(input.summary.source, W - M, y, { align: "right" });
    y += 12;
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(input.summary.text, W - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 12 + 12;
  }

  // Simple bar trend chart
  if (input.trend?.length) {
    const h = 110;
    const cw = W - M * 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text("Portfolio performance trend (weekly)", M, y);
    y += 10;
    const max = Math.max(...input.trend.map((t) => Math.max(t.actual, t.expected))) || 1;
    const bw = cw / input.trend.length;
    input.trend.forEach((t, i) => {
      const x = M + i * bw;
      const ah = (t.actual / max) * h;
      const eh = (t.expected / max) * h;
      doc.setFillColor(29, 53, 96);
      doc.rect(x + bw * 0.15, y + h - ah, bw * 0.35, ah, "F");
      doc.setFillColor(252, 184, 76);
      doc.rect(x + bw * 0.5, y + h - eh, bw * 0.35, eh, "F");
    });
    doc.setDrawColor(203, 213, 225);
    doc.line(M, y + h, M + cw, y + h);
    y += h + 12;
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.setFillColor(29, 53, 96);
    doc.rect(M, y - 6, 8, 6, "F");
    doc.text("Actual (measured)", M + 12, y);
    doc.setFillColor(252, 184, 76);
    doc.rect(M + 92, y - 6, 8, 6, "F");
    doc.text("Expected (simulated model)", M + 104, y);
    doc.text(`${input.trend[0].label} – ${input.trend[input.trend.length - 1].label}`, W - M, y, { align: "right" });
    y += 18;
  }

  for (const s of input.sections) {
    if (!s.body.length) continue;
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(s.title, M, y);
    if (s.note) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(s.note, M, y + 11);
    }
    autoTable(doc, {
      startY: y + (s.note ? 17 : 7),
      head: [s.head],
      body: s.body.map((r) => r.map(String)),
      margin: { left: M, right: M },
      styles: { fontSize: 7.5, cellPadding: 4, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.4 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 24;
  }

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const H = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const disc = doc.splitTextToSize(input.disclaimer, W - M * 2 - 60);
    doc.text(disc, M, H - 28);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 28, { align: "right" });
  }
  return doc;
}
