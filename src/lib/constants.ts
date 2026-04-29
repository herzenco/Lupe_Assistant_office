import type { TaskStatus, TaskPriority, ProjectTag, ActionType } from './types'

export const MONTHLY_BUDGET_USD = Number(process.env.MONTHLY_BUDGET_USD || 150)
export const BUDGET_THRESHOLDS = [75, 90, 100] as const
export const POLL_INTERVAL_MS = 30_000
export const HEARTBEAT_STALE_MS = 120_000 // 2 min without heartbeat = stale

export const PROJECT_TAGS: ProjectTag[] = [
  'Xelerate', 'Xyren', 'ProntoBooks', 'Herzen Co.', 'Skydeo', 'Family Office', 'Xcaret'
]

export const PROJECT_COLORS: Record<ProjectTag, string> = {
  'Xelerate': '#6366f1',
  'Xyren': '#f59e0b',
  'ProntoBooks': '#10b981',
  'Herzen Co.': '#3b82f6',
  'Skydeo': '#8b5cf6',
  'Family Office': '#ec4899',
  'Xcaret': '#14b8a6',
}

export const TASK_STATUSES: TaskStatus[] = ['inbox', 'in_progress', 'blocked', 'review', 'complete']

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: 'Inbox',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  review: 'Review',
  complete: 'Complete',
}

export const TASK_PRIORITIES: TaskPriority[] = ['urgent', 'high', 'normal', 'low']

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  normal: '#3b82f6',
  low: '#6b7280',
}

export const ACTION_TYPES: ActionType[] = [
  'lead_found', 'email_sent', 'email_drafted', 'call_scheduled',
  'document_created', 'document_updated', 'task_completed',
  'research_completed', 'outreach_sent', 'file_moved',
  'error_logged', 'other'
]

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  lead_found: 'Lead Found',
  email_sent: 'Email Sent',
  email_drafted: 'Email Drafted',
  call_scheduled: 'Call Scheduled',
  document_created: 'Doc Created',
  document_updated: 'Doc Updated',
  task_completed: 'Task Done',
  research_completed: 'Research',
  outreach_sent: 'Outreach',
  file_moved: 'File Moved',
  error_logged: 'Error',
  other: 'Other',
}

export const ACTION_TYPE_COLORS: Record<ActionType, string> = {
  lead_found: '#10b981',
  email_sent: '#3b82f6',
  email_drafted: '#60a5fa',
  call_scheduled: '#8b5cf6',
  document_created: '#f59e0b',
  document_updated: '#fbbf24',
  task_completed: '#22c55e',
  research_completed: '#14b8a6',
  outreach_sent: '#6366f1',
  file_moved: '#6b7280',
  error_logged: '#ef4444',
  other: '#9ca3af',
}
