import ExcelJS from 'exceljs/dist/exceljs.min.js';

const COMPANY_NAME = 'HJY TRUCKING & LOGISTICS SERVICES';
const COMPANY_LOCATION = 'Cagayan de Oro City, Mindanao, Philippines';

const THIN_BORDER_COLOR = { argb: 'FFE2E8F0' };
const HEADER_BORDER_COLOR = { argb: 'FFCBD5E1' };
const TOTAL_BORDER_COLOR = { argb: 'FF94A3B8' };

const FONT_FAMILY = 'Calibri';

function getNumFmt(format) {
  if (format === 'currency') return '"₱"#,##0.00';
  if (format === 'integer') return '#,##0';
  if (format === 'decimal') return '#,##0.0';
  if (format === 'percent') return '0.0"%"';
  return undefined;
}

function formatPlainValue(val, format) {
  if (val === null || val === undefined || val === '') return '';
  if (format === 'currency') {
    const n = Number(val);
    if (Number.isFinite(n)) {
      return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }
  if (format === 'integer') {
    const n = Number(val);
    if (Number.isFinite(n)) return Math.round(n).toLocaleString('en-PH');
  }
  if (format === 'decimal') {
    const n = Number(val);
    if (Number.isFinite(n)) return n.toLocaleString('en-PH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return String(val);
}

function estimateDisplayLength(val, format) {
  if (val === null || val === undefined || val === '') return 0;
  if (format === 'currency' && typeof val === 'number') {
    return formatPlainValue(val, 'currency').length + 2;
  }
  if ((format === 'integer' || format === 'decimal') && typeof val === 'number') {
    return formatPlainValue(val, format).length + 1;
  }
  const str = String(val);
  // Longest line if multi-line
  return str.split('\n').reduce((max, line) => Math.max(max, line.length), 0);
}

function sanitizeSheetName(name) {
  const cleaned = String(name || 'Report')
    .replace(/[\\/*?:[\]]/g, '')
    .trim();
  return (cleaned || 'Report').slice(0, 31);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getCurrentUserName() {
  try {
    const raw = localStorage.getItem('auth_user');
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.full_name || parsed?.name || '';
  } catch {
    return '';
  }
}

/**
 * Exports a clean, minimalist, executive-formatted Excel (.xlsx) workbook.
 * Calm palette (white + soft slate headers + thin borders + generous auto-fit column widths).
 */
export async function exportStyledExcel(spec) {
  const {
    filename = 'HJY-Report',
    sheetName = 'Report',
    title = 'Official Report',
    subtitle = '',
    docRef = '',
    generatedBy = getCurrentUserName(),
    summary = [],
    tables = [],
  } = spec || {};

  const workbook = new ExcelJS.Workbook();
  workbook.creator = COMPANY_NAME;
  workbook.created = new Date();

  const maxCols = Math.max(
    4,
    ...tables.map((t) => (Array.isArray(t.columns) ? t.columns.length : 0))
  );

  const ws = workbook.addWorksheet(sanitizeSheetName(sheetName), {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: maxCols >= 6 ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.45, right: 0.45, top: 0.5, bottom: 0.5, header: 0.25, footer: 0.25 },
    },
  });

  // Track max content width per column index (1-based)
  const colWidths = Array(maxCols).fill(12);
  const bumpWidth = (colIdx, len, minW = 10, maxW = 42) => {
    const target = Math.min(maxW, Math.max(minW, len + 5));
    if (target > colWidths[colIdx]) colWidths[colIdx] = target;
  };

  let rowCursor = 1;

  // 1. Minimalist Company Letterhead
  const brandRow = ws.getRow(rowCursor);
  ws.mergeCells(rowCursor, 1, rowCursor, maxCols);
  brandRow.getCell(1).value = COMPANY_NAME;
  brandRow.getCell(1).font = { name: FONT_FAMILY, size: 14, bold: true, color: { argb: 'FF0F172A' } };
  brandRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  brandRow.height = 24;
  rowCursor += 1;

  const titleRow = ws.getRow(rowCursor);
  ws.mergeCells(rowCursor, 1, rowCursor, maxCols);
  titleRow.getCell(1).value = title;
  titleRow.getCell(1).font = { name: FONT_FAMILY, size: 11, bold: true, color: { argb: 'FF334155' } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  titleRow.height = 19;
  rowCursor += 1;

  const metaParts = [
    subtitle,
    docRef ? `Ref: ${docRef}` : '',
    generatedBy ? `Prepared by: ${generatedBy}` : '',
    `Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`,
  ].filter(Boolean);

  const metaRow = ws.getRow(rowCursor);
  ws.mergeCells(rowCursor, 1, rowCursor, maxCols);
  metaRow.getCell(1).value = `${COMPANY_LOCATION}  •  ${metaParts.join('  |  ')}`;
  metaRow.getCell(1).font = { name: FONT_FAMILY, size: 9.5, color: { argb: 'FF64748B' } };
  metaRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  for (let c = 1; c <= maxCols; c++) {
    metaRow.getCell(c).border = { bottom: { style: 'medium', color: HEADER_BORDER_COLOR } };
  }
  metaRow.height = 19;
  rowCursor += 2; // blank breathing row

  // 2. Compact Key Metrics Summary Block
  if (Array.isArray(summary) && summary.length > 0) {
    const secRow = ws.getRow(rowCursor);
    ws.mergeCells(rowCursor, 1, rowCursor, Math.min(4, maxCols));
    secRow.getCell(1).value = 'SUMMARY';
    secRow.getCell(1).font = { name: FONT_FAMILY, size: 9.5, bold: true, color: { argb: 'FF475569' } };
    secRow.height = 18;
    rowCursor += 1;

    // Lay out summary metrics cleanly in 2-column pairs (Label | Value)
    summary.forEach((metric) => {
      const r = ws.getRow(rowCursor);
      r.height = 20;

      const labelCell = r.getCell(1);
      labelCell.value = metric.label;
      labelCell.font = { name: FONT_FAMILY, size: 10, color: { argb: 'FF475569' } };
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      labelCell.alignment = { vertical: 'middle', horizontal: 'left' };
      labelCell.border = {
        top: { style: 'thin', color: THIN_BORDER_COLOR },
        bottom: { style: 'thin', color: THIN_BORDER_COLOR },
        left: { style: 'thin', color: THIN_BORDER_COLOR },
        right: { style: 'thin', color: THIN_BORDER_COLOR },
      };

      const valCell = r.getCell(2);
      const isNumericFmt = ['currency', 'integer', 'decimal', 'percent'].includes(metric.format);
      valCell.value = isNumericFmt && metric.value !== '' && metric.value != null
        ? Number(metric.value)
        : (metric.value ?? '—');
      valCell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FF0F172A' } };
      valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      valCell.alignment = { vertical: 'middle', horizontal: isNumericFmt ? 'right' : 'left' };
      const fmt = getNumFmt(metric.format);
      if (fmt && typeof valCell.value === 'number') {
        valCell.numFmt = fmt;
      }
      valCell.border = {
        top: { style: 'thin', color: THIN_BORDER_COLOR },
        bottom: { style: 'thin', color: THIN_BORDER_COLOR },
        left: { style: 'thin', color: THIN_BORDER_COLOR },
        right: { style: 'thin', color: THIN_BORDER_COLOR },
      };

      bumpWidth(0, String(metric.label || '').length, 16);
      bumpWidth(1, estimateDisplayLength(valCell.value, metric.format), 16);
      rowCursor += 1;
    });

    rowCursor += 1; // blank breathing row
  }

  // 3. Data Tables
  tables.forEach((table) => {
    const columns = Array.isArray(table.columns) ? table.columns : [];
    const rows = Array.isArray(table.rows) ? table.rows : [];
    if (columns.length === 0) return;

    if (table.title) {
      const tRow = ws.getRow(rowCursor);
      ws.mergeCells(rowCursor, 1, rowCursor, columns.length);
      tRow.getCell(1).value = table.title.toUpperCase();
      tRow.getCell(1).font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FF1E293B' } };
      tRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
      tRow.height = 21;
      rowCursor += 1;
    }

    // Table Header Row (calm soft-slate fill + crisp bold charcoal text)
    const headerRow = ws.getRow(rowCursor);
    headerRow.height = 24;
    columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.header;
      cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: col.align || (col.format === 'currency' || col.format === 'integer' || col.format === 'decimal' ? 'right' : 'left'),
        wrapText: false,
      };
      cell.border = {
        top: { style: 'thin', color: HEADER_BORDER_COLOR },
        bottom: { style: 'medium', color: HEADER_BORDER_COLOR },
        left: { style: 'thin', color: THIN_BORDER_COLOR },
        right: { style: 'thin', color: THIN_BORDER_COLOR },
      };
      bumpWidth(i, String(col.header || '').length, col.minWidth || 12, col.maxWidth || 44);
    });
    rowCursor += 1;

    // Empty state row if no records
    if (rows.length === 0) {
      const emptyRow = ws.getRow(rowCursor);
      ws.mergeCells(rowCursor, 1, rowCursor, columns.length);
      emptyRow.getCell(1).value = 'No records available for this selection.';
      emptyRow.getCell(1).font = { name: FONT_FAMILY, size: 10, italic: true, color: { argb: 'FF64748B' } };
      emptyRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      emptyRow.height = 22;
      for (let c = 1; c <= columns.length; c++) {
        emptyRow.getCell(c).border = {
          top: { style: 'thin', color: THIN_BORDER_COLOR },
          bottom: { style: 'thin', color: THIN_BORDER_COLOR },
          left: { style: 'thin', color: THIN_BORDER_COLOR },
          right: { style: 'thin', color: THIN_BORDER_COLOR },
        };
      }
      rowCursor += 2;
      return;
    }

    // Data Rows
    rows.forEach((rowData, rIdx) => {
      const r = ws.getRow(rowCursor);
      r.height = 20;
      const isAlt = rIdx % 2 === 1;

      columns.forEach((col, i) => {
        const raw = rowData[i];
        const cell = r.getCell(i + 1);
        const isNumericFmt = ['currency', 'integer', 'decimal', 'percent'].includes(col.format);
        const numVal = isNumericFmt && raw !== '' && raw !== null && raw !== undefined ? Number(raw) : NaN;

        if (isNumericFmt && Number.isFinite(numVal)) {
          cell.value = numVal;
          const fmt = getNumFmt(col.format);
          if (fmt) cell.numFmt = fmt;
        } else {
          cell.value = raw === null || raw === undefined || raw === '' ? '—' : raw;
        }

        cell.font = {
          name: FONT_FAMILY,
          size: 10,
          bold: Boolean(col.bold),
          color: { argb: 'FF1E293B' },
        };
        if (isAlt) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFBFD' } };
        }
        cell.alignment = {
          vertical: 'middle',
          horizontal: col.align || (isNumericFmt ? 'right' : 'left'),
          wrapText: Boolean(col.wrap),
        };
        cell.border = {
          top: { style: 'thin', color: THIN_BORDER_COLOR },
          bottom: { style: 'thin', color: THIN_BORDER_COLOR },
          left: { style: 'thin', color: THIN_BORDER_COLOR },
          right: { style: 'thin', color: THIN_BORDER_COLOR },
        };

        bumpWidth(i, estimateDisplayLength(cell.value, col.format), col.minWidth || 12, col.maxWidth || 44);
      });
      rowCursor += 1;
    });

    // Optional Totals Row
    if (Array.isArray(table.totalsRow) && table.totalsRow.length > 0) {
      const tr = ws.getRow(rowCursor);
      tr.height = 22;
      columns.forEach((col, i) => {
        const raw = table.totalsRow[i];
        const cell = tr.getCell(i + 1);
        const isNumericFmt = ['currency', 'integer', 'decimal', 'percent'].includes(col.format);
        const numVal = isNumericFmt && raw !== '' && raw !== null && raw !== undefined ? Number(raw) : NaN;

        if (isNumericFmt && Number.isFinite(numVal)) {
          cell.value = numVal;
          const fmt = getNumFmt(col.format);
          if (fmt) cell.numFmt = fmt;
        } else {
          cell.value = raw ?? '';
        }

        cell.font = { name: FONT_FAMILY, size: 10, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.alignment = {
          vertical: 'middle',
          horizontal: col.align || (isNumericFmt ? 'right' : 'left'),
        };
        cell.border = {
          top: { style: 'thin', color: TOTAL_BORDER_COLOR },
          bottom: { style: 'double', color: TOTAL_BORDER_COLOR },
          left: { style: 'thin', color: THIN_BORDER_COLOR },
          right: { style: 'thin', color: THIN_BORDER_COLOR },
        };

        bumpWidth(i, estimateDisplayLength(cell.value, col.format), col.minWidth || 12, col.maxWidth || 44);
      });
      rowCursor += 1;
    }

    rowCursor += 1; // blank breathing row between tables
  });

  // Apply generous auto-fitted column widths (guarantees zero ### dates and zero clipped headers)
  colWidths.forEach((w, idx) => {
    ws.getColumn(idx + 1).width = w;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const safeName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  triggerDownload(blob, safeName);
}

/**
 * Exports a clean, UTF-8 BOM structured CSV (.csv) with full letterhead, summary, all tables, and totals.
 */
export function exportStructuredCsv(spec) {
  const {
    filename = 'HJY-Report',
    title = 'Official Report',
    subtitle = '',
    docRef = '',
    generatedBy = getCurrentUserName(),
    summary = [],
    tables = [],
  } = spec || {};

  const escapeCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines = [];

  lines.push([COMPANY_NAME].map(escapeCell).join(','));
  lines.push([title].map(escapeCell).join(','));
  const meta = [
    subtitle,
    docRef ? `Ref: ${docRef}` : '',
    generatedBy ? `Prepared by: ${generatedBy}` : '',
    `Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`,
  ]
    .filter(Boolean)
    .join(' | ');
  lines.push([meta].map(escapeCell).join(','));
  lines.push('');

  if (Array.isArray(summary) && summary.length > 0) {
    lines.push(['SUMMARY', 'VALUE'].map(escapeCell).join(','));
    summary.forEach((m) => {
      lines.push([m.label, formatPlainValue(m.value, m.format)].map(escapeCell).join(','));
    });
    lines.push('');
  }

  tables.forEach((table) => {
    const columns = Array.isArray(table.columns) ? table.columns : [];
    const rows = Array.isArray(table.rows) ? table.rows : [];
    if (columns.length === 0) return;

    if (table.title) {
      lines.push([table.title.toUpperCase()].map(escapeCell).join(','));
    }
    lines.push(columns.map((c) => escapeCell(c.header)).join(','));

    rows.forEach((row) => {
      lines.push(
        columns
          .map((col, i) => escapeCell(formatPlainValue(row[i], col.format)))
          .join(',')
      );
    });

    if (Array.isArray(table.totalsRow) && table.totalsRow.length > 0) {
      lines.push(
        columns
          .map((col, i) => escapeCell(formatPlainValue(table.totalsRow[i], col.format)))
          .join(',')
      );
    }

    lines.push('');
  });

  // UTF-8 BOM ensures Microsoft Excel renders the ₱ currency symbol cleanly
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const safeName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  triggerDownload(blob, safeName);
}
