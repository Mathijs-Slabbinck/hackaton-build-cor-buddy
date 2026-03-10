import { jsPDF } from 'jspdf';
import type { COR } from '@/contexts/CORContext';
import type { Session } from '@/contexts/AuthContext';
import { USERS, getCompanyName } from '@/contexts/AuthContext';

const formatDate = (d: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatEUR = (n: number) => `€${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

function sanitizeCOR(c: COR) {
  const { pictureUrls, fileUrls, ...rest } = c;
  return { ...rest, attachments: { imageCount: pictureUrls.length, fileCount: fileUrls.length } };
}

// ─── JSON ───────────────────────────────────────────────────

export function exportBulkJSON(cors: COR[], session: Session) {
  const data = {
    exportedAt: new Date().toISOString(),
    exportedBy: session.fullName,
    company: session.companyName,
    totalRecords: cors.length,
    cors: cors.map(sanitizeCOR),
  };
  downloadJSON(data, `cortrack-export-${today()}.json`);
  return cors.length;
}

export function exportSingleJSON(cor: COR, session: Session) {
  const data = {
    exportedAt: new Date().toISOString(),
    exportedBy: session.fullName,
    company: session.companyName,
    cor: sanitizeCOR(cor),
  };
  downloadJSON(data, `COR-${cor.corNumber}-${today()}.json`);
}

function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── PDF ────────────────────────────────────────────────────

const TEAL = '#009A93';
const STATUS_COLORS: Record<string, string> = { Paid: '#009A93', Ongoing: '#856A00', Cancelled: '#EC008C' };

function addHeader(doc: jsPDF, session: Session, pageW: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(TEAL);
  doc.text('CORtrack', 14, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor('#6B7280');
  doc.text(session.companyName, 14, 24);
  doc.text(`Exported by ${session.fullName}`, pageW - 14, 18, { align: 'right' });
  doc.setFontSize(9);
  doc.text(formatDate(new Date().toISOString()), pageW - 14, 23, { align: 'right' });
  doc.setDrawColor(TEAL);
  doc.setLineWidth(0.5);
  doc.line(14, 28, pageW - 14, 28);
}

export function exportBulkPDF(cors: COR[], session: Session) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const cols = [
    { label: 'COR #', w: 28 },
    { label: 'COR NAME', w: 55 },
    { label: 'CLIENT', w: 45 },
    { label: 'TYPE', w: 22 },
    { label: 'TOTAL (AUD)', w: 30 },
    { label: 'PAID %', w: 18 },
    { label: 'STATUS', w: 24 },
  ];
  const tableX = 14;
  const rowH = 7;
  const headerH = 8;
  const maxRowsPerPage = 25;

  let currentPage = 1;
  const totalPages = Math.ceil(cors.length / maxRowsPerPage);

  const drawPage = (startIdx: number) => {
    if (startIdx > 0) doc.addPage('landscape');
    addHeader(doc, session, pageW);

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor('#000000');
    doc.text('Change Order Requests Export', 14, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#6B7280');
    doc.text(`Exported ${formatDate(new Date().toISOString())} · ${cors.length} records`, 14, 44);

    // Table header
    let y = 50;
    doc.setFillColor(TEAL);
    doc.rect(tableX, y, cols.reduce((s, c) => s + c.w, 0), headerH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor('#FFFFFF');
    let x = tableX;
    cols.forEach(col => {
      doc.text(col.label, x + 2, y + 5.5);
      x += col.w;
    });

    // Rows
    y += headerH;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const endIdx = Math.min(startIdx + maxRowsPerPage, cors.length);
    for (let i = startIdx; i < endIdx; i++) {
      const c = cors[i];
      const rowIdx = i - startIdx;
      if (rowIdx % 2 === 1) {
        doc.setFillColor('#EAF5F5');
        doc.rect(tableX, y, cols.reduce((s, col) => s + col.w, 0), rowH, 'F');
      }
      const total = c.price + c.price * c.vat / 100;
      const values = [
        c.corNumber,
        c.corName.length > 30 ? c.corName.slice(0, 28) + '…' : c.corName,
        c.clientName.length > 24 ? c.clientName.slice(0, 22) + '…' : c.clientName,
        c.productType,
        formatEUR(total),
        `${c.paidPercentage.toFixed(0)}%`,
        c.status,
      ];
      x = tableX;
      values.forEach((val, vi) => {
        if (vi === 6) {
          doc.setTextColor(STATUS_COLORS[val] || '#000000');
        } else {
          doc.setTextColor('#000000');
        }
        doc.text(val, x + 2, y + 5);
        x += cols[vi].w;
      });
      y += rowH;
    }

    // Footer
    doc.setTextColor('#6B7280');
    doc.setFontSize(8);
    doc.text(`Page ${currentPage} of ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
    currentPage++;
  };

  for (let i = 0; i < cors.length; i += maxRowsPerPage) {
    drawPage(i);
  }

  doc.save(`cortrack-export-${today()}.pdf`);
  return cors.length;
}

export function exportSinglePDF(cor: COR, session: Session) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();

  addHeader(doc, session, pageW);

  let y = 38;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor('#000000');
  doc.text(cor.corName.length > 50 ? cor.corName.slice(0, 48) + '…' : cor.corName, 14, y);
  y += 8;

  // COR # + status
  doc.setFontSize(10);
  doc.setTextColor('#6B7280');
  doc.text(cor.corNumber, 14, y);
  doc.setTextColor(STATUS_COLORS[cor.status] || '#000000');
  doc.setFont('helvetica', 'bold');
  doc.text(cor.status, 14 + doc.getTextWidth(cor.corNumber + '   '), y);
  y += 4;

  // Divider
  doc.setDrawColor('#E5E7EB');
  doc.setLineWidth(0.3);
  doc.line(14, y, pageW - 14, y);
  y += 6;

  const total = cor.price + cor.price * cor.vat / 100;
  const fields: [string, string][] = [
    ['Client Kind', cor.clientKind],
    ['Client Name', cor.clientName],
    ['VAT / ABN', cor.vatNumber || '—'],
    ['Product Type', cor.productType],
    ['Product Name', cor.productName],
    ['Location', cor.location],
    ['COR Date', formatDate(cor.corDate)],
    ['Created Date', formatDate(cor.creationDate)],
    ['Price (excl VAT)', formatEUR(cor.price)],
    ['VAT %', `${cor.vat}%`],
    ['Total incl. VAT', formatEUR(total)],
    ['Paid Percentage', `${cor.paidPercentage.toFixed(1)}%`],
    ['Status', cor.status],
  ];

  const colW = (pageW - 28) / 2;
  for (let i = 0; i < fields.length; i += 2) {
    const [l1, v1] = fields[i];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#6B7280');
    doc.text(l1.toUpperCase(), 14, y);
    doc.setFontSize(10);
    doc.setTextColor('#000000');
    doc.text(v1.length > 35 ? v1.slice(0, 33) + '…' : v1, 14, y + 4.5);

    if (i + 1 < fields.length) {
      const [l2, v2] = fields[i + 1];
      doc.setFontSize(8);
      doc.setTextColor('#6B7280');
      doc.text(l2.toUpperCase(), 14 + colW, y);
      doc.setFontSize(10);
      doc.setTextColor('#000000');
      doc.text(v2.length > 35 ? v2.slice(0, 33) + '…' : v2, 14 + colW, y + 4.5);
    }
    y += 12;
  }

  // Divider
  doc.setDrawColor('#E5E7EB');
  doc.line(14, y, pageW - 14, y);
  y += 6;

  // Attachments
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor('#6B7280');
  doc.text(`Images: ${cor.pictureUrls.length}    Documents: ${cor.fileUrls.length}`, 14, y);
  y += 5;
  doc.setFontSize(8);
  doc.text('(Attachments not included in export)', 14, y);
  y += 8;

  // Shared / linked
  const sharedUsers = (cor.sharedWith || []).map(uid => USERS.find(u => u.id === uid)).filter(Boolean);
  if (sharedUsers.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#6B7280');
    const names = sharedUsers.map(u => `${u!.fullName} (${getCompanyName(u!.companyId)})`).join(', ');
    doc.text(`Shared with: ${names}`, 14, y);
    y += 6;
  }

  doc.save(`COR-${cor.corNumber}-${today()}.pdf`);
}
