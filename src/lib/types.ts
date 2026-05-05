export type TaskStatus = 'inbox' | 'in_progress' | 'blocked' | 'review' | 'complete'
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low'
export type ProjectTag = string
export type LupeStatus = 'active' | 'idle' | 'error'
export type SessionChannel = 'telegram' | 'tui' | 'api' | 'other'
export type TaskComplexity = 'light' | 'medium' | 'heavy'

export type ActionType =
  | 'lead_found' | 'email_sent' | 'email_drafted' | 'call_scheduled'
  | 'document_created' | 'document_updated' | 'task_completed'
  | 'research_completed' | 'outreach_sent' | 'file_moved'
  | 'error_logged' | 'other'

export interface Heartbeat {
  id: string
  timestamp: string
  status: LupeStatus
  session_type: string | null
  model: string | null
  task: string | null
  action_type: string | null
  detail: string | null
  tokens_in: number
  tokens_out: number
  cost_usd: number
}

export interface CostEntry {
  id: string
  session_id: string | null
  model: string
  tokens_in: number
  tokens_out: number
  cost_usd: number
  created_at: string
}

export interface Session {
  id: string
  session_id: string
  channel: SessionChannel | null
  model: string | null
  summary: string | null
  transcript: Array<{ role: string; content: string; timestamp?: string }>
  token_count: number
  cost_usd: number
  started_at: string
  ended_at: string | null
}

export interface Task {
  id: string
  title: string
  description: string
  priority: TaskPriority
  project_tag: ProjectTag | null
  due_date: string | null
  complexity: TaskComplexity
  status: TaskStatus
  notes: Array<{ text: string; timestamp: string; author: string }>
  created_at: string
  updated_at: string
}

export interface SystemHealth {
  id: string
  timestamp: string
  cpu_pct: number | null
  ram_pct: number | null
  disk_pct: number | null
  gateway_status: 'up' | 'down' | 'unknown'
  drive_status: 'up' | 'down' | 'unknown'
  integrations: Record<string, { status: 'up' | 'down'; last_checked: string }>
}

export interface Action {
  id: string
  action_type: ActionType
  summary: string
  project_tag: ProjectTag | null
  session_id: string | null
  timestamp: string
  created_at: string
}

export interface TimerSession {
  id: string
  project: string
  started_at: string
  stopped_at: string | null
  duration_seconds: number | null
}
