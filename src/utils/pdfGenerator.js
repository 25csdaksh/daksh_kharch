/**
 * HisabSetu — Professional PDF Document Generator
 * Generates genuine, printable, vector A4 financial reports using jsPDF and autoTable.
 * Implements HisabSetu branding, KPI summaries, repeating table headers, page numbers,
 * and safe Indian currency representation.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Decimal-safe Indian Rupee formatting for standard PDF fonts.
 * Uses 'Rs.' to guarantee 100% universal rendering across all PDF readers without unicode glyph missing boxes.
 */
export function formatPdfCurrency(val) {
  const num = Number(val) || 0;
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const formatted = absNum.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${isNegative ? '-' : ''}Rs. ${formatted}`;
}

/**
 * Builds a professional branded financial PDF report.
 * @param {Object} options
 * @param {string} options.title - Report title (e.g. "Monthly Expense Report")
 * @param {string} options.subtitle - Descriptive subtitle or category/account info
 * @param {string} options.dateRangeLabel - Selected date range string (e.g. "01 Oct 2026 – 31 Oct 2026")
 * @param {string} options.generatedBy - User name or email
 * @param {Array<{label: string, value: string}>} [options.kpis] - Key Performance Indicators
 * @param {Array<Object>} options.tables - List of table specifications { headers: string[], rows: any[][], title?: string, columnStyles?: Object }
 * @param {string} [options.notes] - Optional concluding notes or disclaimers
 * @returns {jsPDF}
 */
export function buildFinancialPDF({
  title,
  reportTitle,
  subtitle = '',
  dateRangeLabel = '',
  generatedBy,
  userName,
  kpis = [],
  tables = [],
  tableColumns,
  tableRows,
  notes = ''
}) {
  const effectiveTitle = title || reportTitle || 'HisabSetu Financial Report';
  const effectiveUser = generatedBy || userName || 'Authenticated User';

  let effectiveTables = tables;
  if ((!effectiveTables || effectiveTables.length === 0) && tableColumns && tableRows) {
    effectiveTables = [
      {
        headers: tableColumns.map((c) => (typeof c === 'string' ? c : c.header || c.dataKey)),
        rows: tableRows.map((r) =>
          Array.isArray(r) ? r : tableColumns.map((c) => r[typeof c === 'string' ? c : c.dataKey || c.header] ?? '')
        )
      }
    ];
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });


  const pageWidth = doc.internal.pageSize.getWidth(); // 595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight(); // 841.89 pt
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // 1. Top Emerald Brand Bar
  doc.setFillColor(6, 78, 59); // Deep Emerald #064E3B
  doc.rect(margin, 30, contentWidth, 44, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('HISABSETU', margin + 14, 54);

  // Brand Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(167, 243, 208); // Emerald light accent
  doc.text('YOUR MONEY. A SMARTER YOU.', margin + 14, 66);

  // Generation timestamp on right
  const now = new Date();
  const genDateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const genTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`Generated: ${genDateStr} ${genTimeStr}`, pageWidth - margin - 14, 52, { align: 'right' });
  doc.text(`User: ${effectiveUser}`, pageWidth - margin - 14, 64, { align: 'right' });

  // 2. Report Title & Date Range Section
  let currentY = 96;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // Dark slate #0F172A
  doc.text(effectiveTitle, margin, currentY);

  currentY += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate #64748B
  const subtitleLine = [
    dateRangeLabel ? `Period: ${dateRangeLabel}` : null,
    subtitle || null
  ].filter(Boolean).join('  |  ');

  if (subtitleLine) {
    doc.text(subtitleLine, margin, currentY);
    currentY += 16;
  } else {
    currentY += 8;
  }

  // 3. KPI Summary Boxes (if provided)
  if (kpis && kpis.length > 0) {
    const kpiCount = kpis.length;
    const boxGap = 8;
    const totalGap = (kpiCount - 1) * boxGap;
    const boxWidth = (contentWidth - totalGap) / kpiCount;
    const boxHeight = 44;

    kpis.forEach((kpi, idx) => {
      const boxX = margin + idx * (boxWidth + boxGap);

      // Card Background
      doc.setFillColor(248, 250, 252); // #F8FAFC
      doc.setDrawColor(226, 232, 240); // #E2E8F0
      doc.setLineWidth(0.75);
      doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 4, 4, 'FD');

      // Top subtle accent bar
      doc.setFillColor(6, 78, 59);
      doc.rect(boxX + 4, currentY, boxWidth - 8, 2, 'F');

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label.toUpperCase(), boxX + 8, currentY + 16);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(6, 78, 59);
      doc.text(String(kpi.value), boxX + 8, currentY + 32);
    });

    currentY += boxHeight + 18;
  }

  // 4. Detailed Data Tables (via autoTable)
  effectiveTables.forEach((tbl) => {

    if (tbl.title) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(tbl.title, margin, currentY);
      currentY += 10;
    }

    autoTable(doc, {
      startY: currentY,
      head: [tbl.headers],
      body: tbl.rows && tbl.rows.length > 0 ? tbl.rows : [['No records matching selected criteria.']],
      margin: { left: margin, right: margin, bottom: 45 },
      theme: 'striped',
      headStyles: {
        fillColor: [6, 78, 59], // #064E3B
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: 5
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
        cellPadding: 4.5
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // #F8FAFC
      },
      columnStyles: tbl.columnStyles || {},
      showHead: 'everyPage',
      didDrawPage: (data) => {
        // Footer: Page Number and Confidentiality
        const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
        const totalPages = doc.internal.getNumberOfPages();

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // Slate #94A3B8
        doc.text('HisabSetu Financial Ledger • Confidential & Encrypted', margin, pageHeight - 20);
        doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
      }
    });

    currentY = doc.lastAutoTable.finalY + 20;
  });

  // 5. Concluding Notes
  if (notes) {
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 50;
    }
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`* ${notes}`, margin, currentY);
  }

  // Update total pages accurately across all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
  }

  return doc;
}
