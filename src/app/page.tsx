'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePolling } from '@/hooks/usePolling'
import { format, formatDistanceToNow } from 'date-fns'
import type { Action, ActionType, Heartbeat, Task, WorkReport, WorkReportSource } from '@/lib/types'
import { ACTION_TYPE_COLORS, ACTION_TYPE_LABELS } from '@/lib/constants'
import { useProjects } from '@/hooks/useProjects'
import {
  Activity,
  Archive,
  Bot,
  Brain,
  Briefcase,
  Code2,
  Cpu,
  FileText,
  Heart,
  Landmark,
  LayoutList,
} from 'lucide-react'
import { clsx } from 'clsx'
import Link from 'next/link'

interface HealthData {
  health: {
    cpu_pct: number | null
    ram_pct: number | null
    disk_pct: number | null
    gateway_status: string
    drive_status: string
    integrations: Record<string, { status: string }>
    timestamp: string
  } | null
  last_heartbeat: { timestamp: string; status: string } | null
  uptime_seconds: number | null
  heartbeat_stale: boolean
}

interface ActionsData {
  actions: Action[]
  total: number
}

interface ReportsData {
  reports: WorkReport[]
}

const STATUS_CONFIG = {
  active: { color: 'bg-green-500', label: 'Active', ring: 'ring-green-500/30', text: 'text-green-400' },
  idle: { color: 'bg-zinc-500', label: 'Idle', ring: 'ring-zinc-500/30', text: 'text-zinc-400' },
  error: { color: 'bg-red-500', label: 'Error', ring: 'ring-red-500/30', text: 'text-red-400' },
}

const REPORT_SOURCE_CONFIG: Array<{
  source: WorkReportSource
  label: string
  helper: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
}> = [
  { source: 'lupe_tasks', label: 'Lupe Tasks', helper: 'What Lupe worked on', icon: Bot, color: '#6366f1' },
  { source: 'document_dump', label: 'Document Dump', helper: 'Reviewed files and categories', icon: Archive, color: '#f59e0b' },
  { source: 'codex', label: 'Codex Work', helper: 'Repo and project work', icon: Code2, color: '#3b82f6' },
  { source: 'claude', label: 'Claude Work', helper: 'Claude sessions and outputs', icon: Brain, color: '#8b5cf6' },
  { source: 'investments', label: 'Investments', helper: 'Trades and positions', icon: Landmark, color: '#22c55e' },
]

const DISPLAY_REPORT_SOURCES = REPORT_SOURCE_CONFIG.map(item => item.source)

type ReportItem = {
  name: string
  path: string | null
  summary: string | null
  meta: string[]
}

type TradeItem = {
  ticker: string
  side: string | null
  quantity: string | null
  price: string | null
  timestamp: string | null
  note: string | null
}

type PositionItem = {
  ticker: string
  size: string | null
  averageCost: string | null
  note: string | null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function textFrom(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return null
}

function formatReportDate(value: string, pattern: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : format(date, pattern)
}

function firstText(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = textFrom(record[key])
    if (value) return value
  }
  return null
}

function listFrom(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function appendMeta(meta: string[], label: string, value: string | null) {
  if (value) meta.push(`${label}: ${value}`)
}

function getFallbackPath(details: Record<string, unknown>) {
  return firstText(details, ['path', 'folder', 'project', 'repo', 'repository', 'destination'])
}

function itemFromString(value: string, details: Record<string, unknown>, summary: string | null): ReportItem {
  return {
    name: value,
    path: getFallbackPath(details),
    summary,
    meta: [],
  }
}

function fileItem(value: unknown, details: Record<string, unknown>, fallbackSummary: string | null): ReportItem | null {
  if (typeof value === 'string') return itemFromString(value, details, fallbackSummary)
  const item = asRecord(value)
  if (!item) return null

  const meta: string[] = []
  appendMeta(meta, 'Category', firstText(item, ['category', 'type']))
  appendMeta(meta, 'Status', firstText(item, ['status']))

  return {
    name: firstText(item, ['name', 'file', 'filename', 'title']) || 'Untitled item',
    path: firstText(item, ['path', 'destination', 'folder', 'repo', 'repository', 'project']),
    summary: firstText(item, ['summary', 'reason', 'note', 'rationale', 'description']) || fallbackSummary,
    meta,
  }
}

function taskItem(value: unknown, details: Record<string, unknown>, fallbackSummary: string | null): ReportItem | null {
  if (typeof value === 'string') return itemFromString(value, details, fallbackSummary)
  const item = asRecord(value)
  if (!item) return null

  const meta: string[] = []
  appendMeta(meta, 'Status', firstText(item, ['status', 'state']))
  appendMeta(meta, 'Priority', firstText(item, ['priority']))

  return {
    name: firstText(item, ['name', 'title', 'task']) || 'Untitled task',
    path: firstText(item, ['project', 'folder', 'path']),
    summary: firstText(item, ['summary', 'note', 'description', 'result']) || fallbackSummary,
    meta,
  }
}

function workItem(value: unknown, details: Record<string, unknown>, fallbackSummary: string | null): ReportItem | null {
  if (typeof value === 'string') return itemFromString(value, details, fallbackSummary)
  const item = asRecord(value)
  if (!item) return null

  const meta: string[] = []
  appendMeta(meta, 'Output', firstText(item, ['output', 'artifact']))
  appendMeta(meta, 'Status', firstText(item, ['status']))

  return {
    name: firstText(item, ['name', 'title', 'session', 'project']) || 'Untitled work item',
    path: firstText(item, ['repo', 'repository', 'folder', 'path', 'project']),
    summary: firstText(item, ['summary', 'note', 'description', 'result']) || fallbackSummary,
    meta,
  }
}

function getReportItems(report: WorkReport): ReportItem[] {
  const details = report.details || {}
  const fallbackSummary = report.summary || report.title

  if (report.source === 'lupe_tasks') {
    return [
      ...listFrom(details.tasks).map(item => taskItem(item, details, fallbackSummary)),
      ...listFrom(details.completed).map(item => taskItem(item, details, fallbackSummary)),
      ...listFrom(details.blocked).map(item => taskItem(item, details, fallbackSummary)),
    ].filter((item): item is ReportItem => Boolean(item))
  }

  if (report.source === 'document_dump') {
    return [
      ...listFrom(details.files).map(item => fileItem(item, details, fallbackSummary)),
      ...listFrom(details.items).map(item => fileItem(item, details, fallbackSummary)),
    ].filter((item): item is ReportItem => Boolean(item))
  }

  if (report.source === 'codex' || report.source === 'claude') {
    return [
      ...listFrom(details.sessions).map(item => workItem(item, details, fallbackSummary)),
      ...listFrom(details.items).map(item => workItem(item, details, fallbackSummary)),
      ...listFrom(details.outputs).map(item => workItem(item, details, fallbackSummary)),
    ].filter((item): item is ReportItem => Boolean(item))
  }

  if (report.source === 'investments') {
    return [
      ...listFrom(details.files).map(item => fileItem(item, details, fallbackSummary)),
      ...listFrom(details.items).map(item => fileItem(item, details, fallbackSummary)),
    ].filter((item): item is ReportItem => Boolean(item))
  }

  return []
}

function getDetailCount(report: WorkReport) {
  const details = report.details
  for (const key of ['count', 'added', 'files', 'tasks', 'items', 'sessions', 'trades', 'positions']) {
    const value = details[key]
    if (typeof value === 'number') return value
    if (Array.isArray(value)) return value.length
  }
  return null
}

function formatMoney(value: string | null) {
  if (!value) return null
  const number = Number(value)
  if (Number.isFinite(number)) return `$${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  return value
}

function getTrades(reports: WorkReport[]): TradeItem[] {
  return reports.flatMap(report => listFrom(report.details.trades).flatMap(value => {
    const item = asRecord(value)
    if (!item) return []
    const ticker = firstText(item, ['ticker', 'symbol'])
    if (!ticker) return []

    return [{
      ticker,
      side: firstText(item, ['side', 'action', 'type']),
      quantity: firstText(item, ['quantity', 'qty', 'shares', 'contracts']),
      price: formatMoney(firstText(item, ['price', 'fill_price', 'average_price'])),
      timestamp: firstText(item, ['timestamp', 'date', 'occurred_at']) || report.occurred_at,
      note: firstText(item, ['rationale', 'note', 'summary']),
    }]
  }))
}

function getPositions(reports: WorkReport[]): PositionItem[] {
  return reports.flatMap(report => listFrom(report.details.positions).flatMap(value => {
    const item = asRecord(value)
    if (!item) return []
    const ticker = firstText(item, ['ticker', 'symbol'])
    if (!ticker) return []

    return [{
      ticker,
      size: firstText(item, ['shares', 'quantity', 'qty', 'size', 'position_size']),
      averageCost: formatMoney(firstText(item, ['average_cost', 'avg_cost', 'cost_basis'])),
      note: firstText(item, ['status', 'note', 'summary']),
    }]
  }))
}

function ReportItemRows({ items }: { items: ReportItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="divide-y divide-zinc-800">
      {items.slice(0, 5).map((item, index) => (
        <div key={`${item.name}-${index}`} className="py-3 first:pt-0 last:pb-0">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-100 truncate">{item.name}</p>
              {item.path && <p className="text-xs text-zinc-500 truncate">{item.path}</p>}
            </div>
            {item.meta.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:justify-end">
                {item.meta.slice(0, 2).map(meta => (
                  <span key={meta} className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{meta}</span>
                ))}
              </div>
            )}
          </div>
          {item.summary && <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{item.summary}</p>}
        </div>
      ))}
    </div>
  )
}

function WorkReportSection({
  config,
  reports,
}: {
  config: typeof REPORT_SOURCE_CONFIG[number]
  reports: WorkReport[]
}) {
  const Icon = config.icon

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <span style={{ color: config.color }}>
            <Icon size={14} />
          </span>
          {config.label}
        </h3>
        <span className="text-xs text-zinc-500">{reports.length} today</span>
      </div>
      {!reports.length ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 text-sm text-zinc-500">
          Waiting for the first {config.label.toLowerCase()} report
        </div>
      ) : (
        <div className="space-y-3">
          {reports.slice(0, 4).map(report => {
            const items = getReportItems(report)
            return (
              <div key={report.id} className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{report.title}</p>
                    {report.summary && <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{report.summary}</p>}
                  </div>
                  <span className="text-xs text-zinc-500 flex-shrink-0">
                    {formatReportDate(report.occurred_at, 'MMM d, HH:mm')}
                  </span>
                </div>
                <ReportItemRows items={items} />
                {items.length === 0 && (
                  <p className="text-xs text-zinc-500">
                    No item-level details were included in this report.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function InvestmentsSection({ reports }: { reports: WorkReport[] }) {
  const trades = getTrades(reports)
  const positions = getPositions(reports)

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <Landmark size={14} className="text-green-400" />
          Investments
        </h3>
        <span className="text-xs text-zinc-500">{reports.length} reports today</span>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Latest Trades</p>
            <span className="text-xs text-zinc-500">{trades.length}</span>
          </div>
          {!trades.length ? (
            <p className="text-sm text-zinc-500">No trades reported yet</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {trades.slice(0, 6).map((trade, index) => (
                <div key={`${trade.ticker}-${index}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{trade.ticker}</p>
                      <p className="text-xs text-zinc-500">
                        {[trade.side, trade.quantity, trade.price].filter(Boolean).join(' | ') || 'Trade'}
                      </p>
                    </div>
                    {trade.timestamp && (
                      <span className="text-xs text-zinc-500 flex-shrink-0">
                        {formatReportDate(trade.timestamp, 'MMM d')}
                      </span>
                    )}
                  </div>
                  {trade.note && <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{trade.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Current Positions</p>
            <span className="text-xs text-zinc-500">{positions.length}</span>
          </div>
          {!positions.length ? (
            <p className="text-sm text-zinc-500">No positions reported yet</p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {positions.slice(0, 6).map((position, index) => (
                <div key={`${position.ticker}-${index}`} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{position.ticker}</p>
                      <p className="text-xs text-zinc-500">
                        {[position.size, position.averageCost && `Avg ${position.averageCost}`].filter(Boolean).join(' | ') || 'Position'}
                      </p>
                    </div>
                  </div>
                  {position.note && <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{position.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <WorkReportSection
          config={{ source: 'investments', label: 'Investment Notes', helper: 'Folder reports', icon: FileText, color: '#22c55e' }}
          reports={reports}
        />
      </div>
    </section>
  )
}

export default function Dashboard() {
  const fetchHeartbeats = useCallback(async () => {
    const res = await fetch('/api/heartbeat')
    return res.ok ? (res.json() as Promise<Heartbeat[]>) : []
  }, [])

  const fetchTasks = useCallback(async () => {
    const res = await fetch('/api/tasks')
    return res.ok ? (res.json() as Promise<Task[]>) : []
  }, [])

  const fetchHealth = useCallback(async () => {
    const res = await fetch('/api/health')
    return res.ok ? (res.json() as Promise<HealthData>) : null
  }, [])

  const fetchActions = useCallback(async () => {
    const res = await fetch('/api/actions?limit=5')
    return res.ok ? (res.json() as Promise<ActionsData>) : null
  }, [])

  const fetchAllActions = useCallback(async () => {
    const res = await fetch('/api/actions?limit=500')
    return res.ok ? (res.json() as Promise<ActionsData>) : null
  }, [])

  const fetchReports = useCallback(async () => {
    const res = await fetch('/api/reports?days=1&limit=50')
    return res.ok ? (res.json() as Promise<ReportsData>) : { reports: [] }
  }, [])

  const { data: heartbeats } = usePolling(fetchHeartbeats, 30_000)
  const { data: tasks } = usePolling(fetchTasks, 60_000)
  const { data: health } = usePolling(fetchHealth, 30_000)
  const { data: actionsData } = usePolling(fetchActions, 30_000)
  const { data: allActionsData } = usePolling(fetchAllActions, 120_000)
  const { data: reportsData } = usePolling(fetchReports, 60_000)
  const { projects, getProjectColor } = useProjects()
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(interval)
  }, [])

  const latest = heartbeats?.[0]
  const statusConfig = latest ? STATUS_CONFIG[latest.status] : STATUS_CONFIG.idle
  const isStale = latest
    ? nowMs - new Date(latest.timestamp).getTime() > 120_000
    : true

  const activeTasks = (tasks || []).filter(t => t.status === 'in_progress')
  const inboxCount = (tasks || []).filter(t => t.status === 'inbox').length
  const blockedCount = (tasks || []).filter(t => t.status === 'blocked').length
  const completedToday = (tasks || []).filter(t => {
    if (t.status !== 'complete') return false
    const today = new Date().toISOString().split('T')[0]
    return t.updated_at.startsWith(today)
  }).length

  const healthAgeMs = health?.health?.timestamp
    ? nowMs - new Date(health.health.timestamp).getTime()
    : Number.POSITIVE_INFINITY
  const healthIsFresh = healthAgeMs <= 120_000
  const displayHealth = healthIsFresh ? health?.health : null

  const integrationsUp = health?.health?.integrations
    ? Object.values(health.health.integrations).filter(i => i.status === 'up').length
    : 0
  const integrationsTotal = health?.health?.integrations
    ? Object.keys(health.health.integrations).length
    : 0

  const reports = useMemo(() => reportsData?.reports || [], [reportsData?.reports])
  const visibleReports = useMemo(
    () => reports.filter(report => DISPLAY_REPORT_SOURCES.includes(report.source)),
    [reports]
  )
  const reportsBySource = useMemo(() => {
    return REPORT_SOURCE_CONFIG.reduce((acc, item) => {
      acc[item.source] = visibleReports.filter(report => report.source === item.source)
      return acc
    }, {} as Record<WorkReportSource, WorkReport[]>)
  }, [visibleReports])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard</h2>
          <p className="text-sm text-zinc-400 mt-1">Lupe Command Center</p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3">
          <div className={clsx('w-3 h-3 rounded-full ring-4', statusConfig.color, statusConfig.ring, !isStale && latest?.status === 'active' && 'animate-pulse')} />
          <div>
            <span className={clsx('text-sm font-semibold', isStale ? 'text-zinc-500' : statusConfig.text)}>
              {isStale ? 'Offline' : statusConfig.label}
            </span>
            {latest && (
              <p className="text-xs text-zinc-500">
                {formatDistanceToNow(new Date(latest.timestamp), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>

      {health?.heartbeat_stale && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
          <Heart size={16} className="text-red-400" />
          <span className="text-sm text-red-300">
            Heartbeat stale - last seen {health.last_heartbeat
              ? formatDistanceToNow(new Date(health.last_heartbeat.timestamp), { addSuffix: true })
              : 'never'}
          </span>
        </div>
      )}

      {latest?.task && !isStale && (
        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Current Task</span>
          </div>
          <p className="text-white font-medium">{latest.task}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
            {latest.model && <span className="px-1.5 py-0.5 rounded bg-zinc-800">{latest.model}</span>}
            {latest.session_type && <span>{latest.session_type}</span>}
          </div>
        </div>
      )}

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Work Reports Snapshot</h3>
          <span className="text-xs text-zinc-500">{visibleReports.length} visible reports today</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {REPORT_SOURCE_CONFIG.map(({ source, label, helper, icon: Icon, color }) => {
            const sourceReports = reportsBySource[source] || []
            const latestReport = sourceReports[0]
            const count = latestReport ? getDetailCount(latestReport) : null

            return (
              <div key={source} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, color }}>
                    <Icon size={16} className="flex-shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{label}</p>
                    <p className="text-xs text-zinc-500 truncate">{helper}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{sourceReports.length}</span>
                  <span className="text-xs text-zinc-500">today</span>
                  {count !== null && <span className="ml-auto text-xs text-zinc-400">{count} items</span>}
                </div>
                <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                  {latestReport
                    ? latestReport.summary || latestReport.title
                    : 'Waiting for the first report'}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {REPORT_SOURCE_CONFIG.filter(config => config.source !== 'investments').map(config => (
        <WorkReportSection
          key={config.source}
          config={config}
          reports={reportsBySource[config.source] || []}
        />
      ))}

      <InvestmentsSection reports={reportsBySource.investments || []} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Link href="/tasks" className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <LayoutList size={14} className="text-zinc-500" />
            <span className="text-xs text-zinc-500">Tasks</span>
          </div>
          <p className="text-2xl font-bold text-white">{activeTasks.length} <span className="text-sm font-normal text-zinc-500">active</span></p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            {inboxCount > 0 && <span className="text-blue-400">{inboxCount} inbox</span>}
            {blockedCount > 0 && <span className="text-red-400">{blockedCount} blocked</span>}
            {completedToday > 0 && <span className="text-green-400">{completedToday} done today</span>}
          </div>
        </Link>

        <Link href="/health" className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Cpu size={14} className="text-zinc-500" />
            <span className="text-xs text-zinc-500">System</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white">{displayHealth?.cpu_pct?.toFixed(0) ?? '-' }%</p>
            <span className="text-xs text-zinc-500">CPU</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
            <span>RAM {displayHealth?.ram_pct?.toFixed(0) ?? '-'}%</span>
            <span>Disk {displayHealth?.disk_pct?.toFixed(0) ?? '-'}%</span>
          </div>
          {!healthIsFresh && <p className="text-xs text-zinc-500 mt-2">No recent local metrics</p>}
        </Link>

        <Link href="/health" className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={14} className="text-zinc-500" />
            <span className="text-xs text-zinc-500">Integrations</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {integrationsTotal > 0 ? `${integrationsUp}/${integrationsTotal}` : '-'}
          </p>
          <p className="text-xs mt-2 text-zinc-400">
            {integrationsUp === integrationsTotal && integrationsTotal > 0
              ? <span className="text-green-400">All connected</span>
              : integrationsTotal > 0
                ? <span className="text-yellow-400">{integrationsTotal - integrationsUp} need attention</span>
                : 'No data'}
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recent Reports</h3>
            <span className="text-xs text-zinc-500">Last 24 hours</span>
          </div>
          {!visibleReports.length ? (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 text-center text-zinc-500 text-sm">
              No work reports yet
            </div>
          ) : (
            <div className="space-y-1">
              {visibleReports.slice(0, 8).map(report => {
                const config = REPORT_SOURCE_CONFIG.find(item => item.source === report.source) || REPORT_SOURCE_CONFIG[0]
                return (
                  <div key={report.id} className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-zinc-900/50">
                    <span className="text-xs text-zinc-600 w-12 flex-shrink-0 font-mono">
                      {format(new Date(report.occurred_at), 'HH:mm')}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ background: `${config.color}20`, color: config.color }}
                    >
                      {config.label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{report.title}</p>
                      {report.summary && <p className="text-xs text-zinc-500 truncate">{report.summary}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recent Actions</h3>
            <Link href="/actions" className="text-xs text-indigo-400 hover:text-indigo-300">View all</Link>
          </div>
          {!actionsData?.actions?.length ? (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 text-center text-zinc-500 text-sm">
              No actions logged yet
            </div>
          ) : (
            <div className="space-y-1">
              {actionsData.actions.map(action => (
                <div key={action.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-zinc-900/50">
                  <span className="text-xs text-zinc-600 w-12 flex-shrink-0 font-mono">
                    {format(new Date(action.timestamp), 'HH:mm')}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{
                      background: `${ACTION_TYPE_COLORS[action.action_type as ActionType]}20`,
                      color: ACTION_TYPE_COLORS[action.action_type as ActionType],
                    }}
                  >
                    {ACTION_TYPE_LABELS[action.action_type as ActionType]}
                  </span>
                  <span className="text-sm text-zinc-300 truncate">{action.summary}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(() => {
        const allActions = allActionsData?.actions || []
        const allTasks = tasks || []
        const projectStats: Record<string, { actions: number; tasks: number; active: number; completed: number; files: number }> = {}

        for (const project of projects) {
          projectStats[project.name] = { actions: 0, tasks: 0, active: 0, completed: 0, files: project.file_count || 0 }
        }

        const registeredNames = new Set(projects.map(project => project.name))

        for (const action of allActions) {
          const tag = action.project_tag
          if (!tag || !registeredNames.has(tag)) continue
          projectStats[tag].actions++
        }

        for (const task of allTasks) {
          const tag = task.project_tag
          if (!tag || !registeredNames.has(tag)) continue
          projectStats[tag].tasks++
          if (task.status === 'in_progress') projectStats[tag].active++
          if (task.status === 'complete') projectStats[tag].completed++
        }

        const entries = Object.entries(projectStats)
          .sort((a, b) => b[1].actions - a[1].actions || b[1].tasks - a[1].tasks || a[0].localeCompare(b[0]))

        if (entries.length === 0) return null

        return (
          <div className="mt-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Briefcase size={14} />
                Projects
              </h3>
              <span className="text-xs text-zinc-500">{entries.length} projects</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {entries.map(([name, stats]) => {
                const color = getProjectColor(name)
                return (
                  <div key={name} className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-sm font-semibold text-white">{name}</span>
                    </div>
                    <div className="flex items-center flex-wrap gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <FileText size={11} />
                        {stats.files > 0 ? `${stats.files} files` : '-'}
                      </span>
                      {stats.actions > 0 && <span>{stats.actions} actions</span>}
                      {stats.tasks > 0 && <span>{stats.tasks} tasks</span>}
                      {stats.active > 0 && <span className="text-indigo-400">{stats.active} active</span>}
                      {stats.completed > 0 && <span className="text-green-400">{stats.completed} done</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Latest Heartbeats</h3>
          <Link href="/activity" className="text-xs text-indigo-400 hover:text-indigo-300">View all</Link>
        </div>
        {!heartbeats?.length ? (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 text-center text-zinc-500 text-sm">
            No heartbeats yet
          </div>
        ) : (
          <div className="space-y-1">
            {heartbeats.slice(0, 5).map(hb => (
              <div key={hb.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-zinc-900/50">
                <div className={clsx('w-2 h-2 rounded-full flex-shrink-0',
                  hb.status === 'active' ? 'bg-green-500' : hb.status === 'error' ? 'bg-red-500' : 'bg-zinc-500'
                )} />
                <span className="text-sm text-zinc-300 flex-1 truncate">
                  {hb.action_type?.replace(/_/g, ' ') || hb.task || hb.status}
                </span>
                {hb.model && <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{hb.model}</span>}
                <span className="text-xs text-zinc-600">
                  {formatDistanceToNow(new Date(hb.timestamp), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
