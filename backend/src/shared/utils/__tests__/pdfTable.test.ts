/**
 * pdfTable.test.ts - Unit tests for the zero-dep PDF builder.
 */

import { describe, it, expect } from 'vitest';
import { buildPdfTable } from '../pdfTable.js';

describe('buildPdfTable', () => {
  it('returns a PDF buffer with a valid header', () => {
    // Happy path: title + one data row must produce a parseable PDF-1.4 file
    const buf = buildPdfTable({
      title: 'Test Export',
      subtitle: 'unit test',
      headers: ['id', 'name'],
      rows: [['1', 'Alice']],
    });

    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(buf.toString('utf8')).toContain('%%EOF');
    expect(buf.toString('utf8')).toContain('Test Export');
  });

  it('handles an empty row set without throwing', () => {
    // Edge: empty exports still need a valid single-page PDF
    const buf = buildPdfTable({
      title: 'Empty',
      headers: ['a', 'b'],
      rows: [],
    });

    expect(buf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(buf.toString('utf8')).toContain('/Count 1');
  });

  it('paginates when there are many rows', () => {
    // Edge: large tables should span multiple pages
    const rows = Array.from({ length: 80 }, (_, i) => [String(i), `row-${i}`]);
    const buf = buildPdfTable({
      title: 'Paged',
      headers: ['id', 'name'],
      rows,
    });

    const text = buf.toString('utf8');
    expect(text).toMatch(/\/Count [2-9]/); // more than one page
  });

  it('escapes parentheses in cell values', () => {
    // Failure-ish input: PDF special chars must not break the stream
    const buf = buildPdfTable({
      title: 'Escapes',
      headers: ['note'],
      rows: [['hello (world)']],
    });

    expect(buf.toString('utf8')).toContain('hello \\(world\\)');
  });
});
