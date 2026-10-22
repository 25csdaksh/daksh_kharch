/**
 * HisabSetu — Ledger Account Statement Generator
 * Generates official PDF and CSV statements for an individual person/contact.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPdfCurrency } from './pdfGenerator.js';
import { formatLedgerINR } from './ledgerEngine.js';

/**
 * Generates and downloads a clean, vector A4 account statement PDF.
 */
export function generateLedgerStatementPDF({ contact, balance, entries, userName = 'HisabSetu User' }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [6, 78, 59]; // Emerald #064E3B
  const slateDark = [15, 23, 42]; // Slate #0F172A
  const goldColor = [212, 175, 55]; // Gold #D4AF37

  // Top Accent Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 8, 'F');

  // Brand Name & Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...primaryColor);
  doc.text('HisabSetu', 14, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Personal Finance & Account Ledger', 14, 26);

  // Statement Metadata (Right-aligned)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...slateDark);
  doc.text('ACCOUNT STATEMENT', 196, 20, { align: 'right' });

  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${generatedDate}`, 196, 26, { align: 'right' });
  doc.text(`Account Holder: ${userName}`, 196, 31, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 35, 196, 35);

  // Person Details Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 38, 182, 22, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...slateDark);
  doc.text(`Person: ${contact.name}`, 18, 45);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const contactDetails = [
    contact.phone ? `Phone: ${contact.phone}` : null,
    contact.email ? `Email: ${contact.email}` : null
  ].filter(Boolean).join('  •  ');
  doc.text(contactDetails || 'Personal Ledger Account', 18, 51);

  if (contact.notes) {
    doc.text(`Notes: ${contact.notes}`, 18, 56);
  }

  // Summary KPI Cards
  const kpis = [
    { label: 'Total Lent', value: formatPdfCurrency(balance.totalLent) },
    { label: 'Total Repaid', value: formatPdfCurrency(balance.totalRepaidReceived) },
    { label: 'Total Borrowed', value: formatPdfCurrency(balance.totalBorrowed) },
    {
      label: balance.netBalance >= 0 ? 'Net Receivable' : 'Net Payable',
      value: formatPdfCurrency(Math.abs(balance.netBalance)),
      highlight: true
    }
  ];

  const cardWidth = 43;
  const cardGap = 3.3;
  let startX = 14;
  const startY = 64;

  kpis.forEach((kpi) => {
    if (kpi.highlight) {
      doc.setFillColor(254, 243, 199); // Gold light
      doc.setDrawColor(...goldColor);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
    }
    doc.roundedRect(startX, startY, cardWidth, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, startX + 3, startY + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...(kpi.highlight ? primaryColor : slateDark));
    doc.text(kpi.value, startX + 3, startY + 12);

    startX += cardWidth + cardGap;
  });

  // Table of transactions
  const sortedEntries = [...entries].sort((a, b) => {
    const da = new Date(a.transaction_date).getTime();
    const db = new Date(b.transaction_date).getTime();
    return da - db;
  });

  const tableHeaders = ['Date', 'Type', 'Description', 'Method', 'Receivable', 'Payable'];
  const tableRows = sortedEntries.map((e) => {
    const isReceivable = e.entry_type === 'lend' || (e.entry_type === 'opening' && e.direction === 'receivable');
    const isPayable = e.entry_type === 'borrow' || (e.entry_type === 'opening' && e.direction === 'payable');
    const isRepayReceived = e.entry_type === 'repay_received';
    const isRepayPaid = e.entry_type === 'repay_paid';

    let typeLabel = e.entry_type.toUpperCase();
    if (e.entry_type === 'lend') typeLabel = 'Money Lent';
    if (e.entry_type === 'borrow') typeLabel = 'Money Borrowed';
    if (e.entry_type === 'repay_received') typeLabel = 'Repayment (In)';
    if (e.entry_type === 'repay_paid') typeLabel = 'Repayment (Out)';
    if (e.entry_type === 'opening') typeLabel = 'Opening Balance';
    if (e.entry_type === 'adjustment') typeLabel = 'Adjustment';

    const recCol = isReceivable ? `+${formatPdfCurrency(e.amount)}` : (isRepayReceived ? `-${formatPdfCurrency(e.amount)}` : '-');
    const payCol = isPayable ? `+${formatPdfCurrency(e.amount)}` : (isRepayPaid ? `-${formatPdfCurrency(e.amount)}` : '-');

    return [
      e.transaction_date,
      typeLabel,
      e.description || e.adjustment_reason || '-',
      e.payment_method || '-',
      recCol,
      payCol
    ];
  });

  autoTable(doc, {
    startY: 84,
    head: [tableHeaders],
    body: tableRows.length > 0 ? tableRows : [['-', 'No transactions recorded', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: slateDark
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 30 },
      2: { cellWidth: 55 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  // Footer Disclaimer
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 150;
  if (finalY < 270) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('This is a computer-generated personal ledger statement from HisabSetu. Private and confidential.', 14, finalY);
  }

  const safeFileName = `hisabsetu-ledger-${(contact.name || 'statement').replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(safeFileName);
}

/**
 * Generates and downloads an RFC-4180 CSV statement for a contact.
 */
export function generateLedgerStatementCSV({ contact, balance, entries }) {
  const sanitize = (text) => {
    if (text === null || text === undefined) return '""';
    let s = String(text).replace(/"/g, '""');
    // Formula injection mitigation
    if (/^[=+@-]/i.test(s)) {
      s = `'${s}`;
    }
    return `"${s}"`;
  };

  const lines = [
    `"HisabSetu Account Statement"`,
    `"Person Name",${sanitize(contact.name)}`,
    `"Phone",${sanitize(contact.phone || 'N/A')}`,
    `"Net Balance",${sanitize(formatLedgerINR(balance.netBalance))}`,
    `"Status",${sanitize(balance.status.toUpperCase())}`,
    `""`,
    `"Date","Type","Direction","Amount","Payment Method","Due Date","Description","Reference"`
  ];

  for (const e of entries) {
    lines.push([
      sanitize(e.transaction_date),
      sanitize(e.entry_type),
      sanitize(e.direction),
      sanitize(e.amount),
      sanitize(e.payment_method || 'Cash'),
      sanitize(e.due_date || ''),
      sanitize(e.description || e.adjustment_reason || ''),
      sanitize(e.reference_number || '')
    ].join(','));
  }

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `hisabsetu-ledger-${(contact.name || 'statement').replace(/\s+/g, '-').toLowerCase()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
