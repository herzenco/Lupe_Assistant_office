export const WORK_REPORT_SOURCES = [
  'lupe_tasks',
  'lupe_folder',
  'document_dump',
  'codex',
  'claude',
] as const

export type WorkReportSource = typeof WORK_REPORT_SOURCES[number]

export interface WorkReportInput {
  source?: unknown
  title?: unknown
  summary?: unknown
  details?: unknown
  occurred_at?: unknown
}

export interface NormalizedWorkReport {
  source: WorkReportSource
  title: string
  summary: string | null
  details: Record<string, unknown>
  occurred_at: string | null
}

export function isWorkReportSource(value: unknown): value is WorkReportSource {
  return typeof value === 'string' && WORK_REPORT_SOURCES.includes(value as WorkReportSource)
}

export function normalizeWorkReportInput(input: WorkReportInput): NormalizedWorkReport {
  if (!isWorkReportSource(input.source)) {
    throw new Error(`source must be one of: ${WORK_REPORT_SOURCES.join(', ')}`)
  }

  if (typeof input.title !== 'string' || input.title.trim().length === 0) {
    throw new Error('title is required')
  }

  if (input.summary !== undefined && input.summary !== null && typeof input.summary !== 'string') {
    throw new Error('summary must be a string')
  }

  if (
    input.details !== undefined
    && input.details !== null
    && (typeof input.details !== 'object' || Array.isArray(input.details))
  ) {
    throw new Error('details must be an object')
  }

  if (
    input.occurred_at !== undefined
    && input.occurred_at !== null
    && (typeof input.occurred_at !== 'string' || Number.isNaN(new Date(input.occurred_at).getTime()))
  ) {
    throw new Error('occurred_at must be an ISO timestamp')
  }

  return {
    source: input.source,
    title: input.title.trim(),
    summary: typeof input.summary === 'string' && input.summary.trim() ? input.summary.trim() : null,
    details: input.details && typeof input.details === 'object' && !Array.isArray(input.details)
      ? input.details as Record<string, unknown>
      : {},
    occurred_at: typeof input.occurred_at === 'string' ? new Date(input.occurred_at).toISOString() : null,
  }
}
