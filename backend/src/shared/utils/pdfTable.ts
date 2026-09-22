/**
 * pdfTable.ts - Minimal PDF table builder (no third-party deps).
 *
 * Generates a valid PDF-1.4 document with Helvetica text rows.
 * Good enough for CRM tabular exports; not a full typesetting engine.
 */

export interface PdfTableInput {
    title: string;
    subtitle?: string;
    headers: string[];
    /** Each row is parallel to headers */
    rows: string[][];
}

const PAGE_WIDTH = 792; // landscape letter
const PAGE_HEIGHT = 612;
const MARGIN = 36;
const FONT_SIZE = 8;
const TITLE_SIZE = 14;
const ROW_HEIGHT = 12;
const HEADER_HEIGHT = 14;

/** Escape PDF literal string content. */
const pdfEscape = (value: string): string =>
    value
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/[^\x20-\x7E]/g, (ch) => {
            // Drop non-ASCII for Helvetica Type1 compatibility
            const code = ch.charCodeAt(0);
            return code < 256 ? `\\${code.toString(8).padStart(3, '0')}` : '?';
        });

const truncate = (value: string, maxChars: number): string => {
    const cleaned = value.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= maxChars) return cleaned;
    return `${cleaned.slice(0, Math.max(0, maxChars - 1))}…`;
};

/**
 * Build a multi-page landscape PDF table.
 * Returns a Buffer suitable for Content-Disposition attachment.
 */
export const buildPdfTable = (input: PdfTableInput): Buffer => {
    const colCount = Math.max(input.headers.length, 1);
    const usableWidth = PAGE_WIDTH - MARGIN * 2;
    const colWidth = usableWidth / colCount;
    const maxCharsPerCol = Math.max(6, Math.floor(colWidth / (FONT_SIZE * 0.5)));

    const headers = input.headers.map((h) => truncate(String(h), maxCharsPerCol));
    const rows = input.rows.map((row) =>
        headers.map((_, i) => truncate(String(row[i] ?? ''), maxCharsPerCol)),
    );

    const titleBlock = TITLE_SIZE + (input.subtitle ? 12 : 0) + 16;
    const rowsPerPage = Math.max(
        1,
        Math.floor((PAGE_HEIGHT - MARGIN * 2 - titleBlock - HEADER_HEIGHT) / ROW_HEIGHT),
    );

    const pages: string[] = [];
    if (rows.length === 0) {
        pages.push(renderPage(input, headers, [], 0, 1, colWidth, titleBlock));
    } else {
        const totalPages = Math.ceil(rows.length / rowsPerPage);
        for (let p = 0; p < totalPages; p += 1) {
            const slice = rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
            pages.push(renderPage(input, headers, slice, p, totalPages, colWidth, titleBlock));
        }
    }

    return assemblePdf(pages);
};

const renderPage = (
    input: PdfTableInput,
    headers: string[],
    rows: string[][],
    pageIndex: number,
    totalPages: number,
    colWidth: number,
    titleBlock: number,
): string => {
    const lines: string[] = [];
    let y = PAGE_HEIGHT - MARGIN;

    lines.push('BT');
    lines.push(`/F1 ${TITLE_SIZE} Tf`);
    lines.push(`1 0 0 1 ${MARGIN} ${y - TITLE_SIZE} Tm`);
    lines.push(`(${pdfEscape(input.title)}) Tj`);
    y -= TITLE_SIZE + 4;

    if (input.subtitle) {
        lines.push(`/F1 9 Tf`);
        lines.push(`1 0 0 1 ${MARGIN} ${y - 9} Tm`);
        lines.push(`(${pdfEscape(input.subtitle)}) Tj`);
        y -= 12;
    }

    const footer = `Page ${pageIndex + 1} of ${totalPages}`;
    lines.push(`/F1 8 Tf`);
    lines.push(`1 0 0 1 ${PAGE_WIDTH - MARGIN - 70} ${MARGIN - 12} Tm`);
    lines.push(`(${pdfEscape(footer)}) Tj`);

    y = PAGE_HEIGHT - MARGIN - titleBlock;

    // Header row
    lines.push(`/F1 ${FONT_SIZE} Tf`);
    headers.forEach((h, i) => {
        const x = MARGIN + i * colWidth;
        lines.push(`1 0 0 1 ${x} ${y} Tm`);
        lines.push(`(${pdfEscape(h)}) Tj`);
    });
    y -= HEADER_HEIGHT;

    rows.forEach((row) => {
        row.forEach((cell, i) => {
            const x = MARGIN + i * colWidth;
            lines.push(`1 0 0 1 ${x} ${y} Tm`);
            lines.push(`(${pdfEscape(cell)}) Tj`);
        });
        y -= ROW_HEIGHT;
    });

    lines.push('ET');
    return lines.join('\n');
};

const assemblePdf = (contentStreams: string[]): Buffer => {
    const objects: string[] = [];

    // 1: Catalog
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // We'll assign:
    // 2 = Pages
    // 3..N = page objects
    // then content streams
    // then font

    const pageCount = contentStreams.length;
    const pageObjIds: number[] = [];
    const contentObjIds: number[] = [];

    let nextId = 3;
    for (let i = 0; i < pageCount; i += 1) {
        pageObjIds.push(nextId++);
    }
    for (let i = 0; i < pageCount; i += 1) {
        contentObjIds.push(nextId++);
    }
    const fontId = nextId++;

    const kids = pageObjIds.map((id) => `${id} 0 R`).join(' ');
    objects.push(
        `2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj\n`,
    );

    for (let i = 0; i < pageCount; i += 1) {
        const pageId = pageObjIds[i]!;
        const contentId = contentObjIds[i]!;
        objects.push(
            `${pageId} 0 obj\n` +
                `<< /Type /Page /Parent 2 0 R ` +
                `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
                `/Contents ${contentId} 0 R ` +
                `/Resources << /Font << /F1 ${fontId} 0 R >> >> >>\n` +
                `endobj\n`,
        );
    }

    for (let i = 0; i < pageCount; i += 1) {
        const contentId = contentObjIds[i]!;
        const stream = contentStreams[i]!;
        objects.push(
            `${contentId} 0 obj\n` +
                `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\n` +
                `stream\n${stream}\nendstream\nendobj\n`,
        );
    }

    objects.push(
        `${fontId} 0 obj\n` +
            `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n` +
            `endobj\n`,
    );

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];

    for (const obj of objects) {
        offsets.push(Buffer.byteLength(pdf, 'utf8'));
        pdf += obj;
    }

    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    const objCount = objects.length;
    pdf += `xref\n0 ${objCount + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objCount; i += 1) {
        pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefStart}\n%%EOF\n`;

    return Buffer.from(pdf, 'utf8');
};
