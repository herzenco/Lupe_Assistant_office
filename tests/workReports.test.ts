import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeWorkReportInput } from '../src/lib/workReports.ts'

test('normalizeWorkReportInput accepts a valid report with structured details', () => {
  const report = normalizeWorkReportInput({
    source: 'document_dump',
    title: 'Categorized incoming documents',
    summary: 'Invoices moved to finance, drafts moved to review.',
    details: { added: 8, categories: ['finance', 'review'] },
    occurred_at: '2026-06-22T14:00:00.000Z',
  })

  assert.deepEqual(report, {
    source: 'document_dump',
    title: 'Categorized incoming documents',
    summary: 'Invoices moved to finance, drafts moved to review.',
    details: { added: 8, categories: ['finance', 'review'] },
    occurred_at: '2026-06-22T14:00:00.000Z',
  })
})

test('normalizeWorkReportInput rejects unknown sources', () => {
  assert.throws(() => normalizeWorkReportInput({
    source: 'timer',
    title: 'Tracked time',
  }), /source must be one of/)
})
