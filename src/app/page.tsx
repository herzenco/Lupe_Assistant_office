'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { usePolling } from '@/hooks/usePolling'
import { formatDistanceToNow, format } from 'date-fns'
import type { Heartbeat, Task, Action } from '@/lib/types'
import { TASK_STATUS_LABELS, PRIORITY_COLORS, ACTION_TYPE_LABELS, ACTION_TYPE_COLORS } from '@/lib/constants'
import { useProjects } from '@/hooks/useProjects'
import type { ActionType, TaskPriority } from '@/lib/types'
import {
  Activity, Cpu, Zap, DollarSign, LayoutList, Clock,
  Heart, AlertTriangle, TrendingUp, CheckCircle2, Briefcase,
  Timer, Square, PieChart as PieChartIcon, FileText
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { clsx } from 'clsx'
import Link from 'next/link'

interface CostData {
  total_spend: number
  budget: number
  budget_pct: number
  projected_spend: number
  budget_remaining: number
  source: 'codexbar' | 'sessions'
  codexbar_spend: number
  session_spend: number
  by_provider?: Record<string, { cost: number; tokens_total: number; reported_at: string }>
  by_model: Record<string, { cost: number; tokens_in: number; tokens_out: number }>
}

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

interface TimerActive {
  project: string
  startedAt: string
  elapsed: number
  running: true
}

interface TimerHistoryEntry {
  project: string
  startedAt: string
  stoppedAt: string
  duration: number
}

interface TimerSummaryEntry {
  project: string
  totalToday: number
}

interface TimerStatsProject {
  project: string
  today: number
  week: number
  month: number
  year: number
}

interface TimerStatsData {
  projects: TimerStatsProject[]
  totals: { today: number; week: number; month: number; year: number }
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatHoursMinutes(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

const STATUS_CONFIG = {
  active: { color: 'bg-green-500', label: 'Active', ring: 'ring-green-500/30', text: 'text-green-400' },
  idle: { color: 'bg-zinc-500', label: 'Idle', ring: 'ring-zinc-500/30', text: 'text-zinc-400' },
  error: { color: 'bg-red-500', label: 'Error', ring: 'ring-red-500/30', text: 'text-red-400' },
}

export default function Dashboard() {
  const fetchHeartbeats = useCallback(async () => {
    const res = await fetch('/api/heartbeat')
    return res.ok ? (res.json() as Promise<Heartbeat[]>) : []
  }, [])

  const fetchCosts = useCallback(async () => {
    const res = await fetch('/api/cost')
    return res.ok ? (res.json() as Promise<CostData>) : null
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

  const fetchTimerActive = useCallback(async () => {
    const res = await fetch('/api/timer/current')
    return res.ok ? (res.json() as Promise<TimerActive[]>) : []
  }, [])

  const fetchTimerSummary = useCallback(async () => {
    const res = await fetch('/api/timer/summary')
    return res.ok ? (res.json() as Promise<TimerSummaryEntry[]>) : []
  }, [])

  const fetchTimerStats = useCallback(async () => {
    const res = await fetch('/api/timer/stats')
    return res.ok ? (res.json() as Promise<TimerStatsData>) : null
  }, [])

  const fetchFileCounts = useCallback(async () => {
    const res = await fetch('/api/files')
    if (!res.ok) return null
    const data = await res.json()
    return data.counts as Record<string, number>
  }, [])

  const { data: heartbeats } = usePolling(fetchHeartbeats, 30_000)
  const { data: costs } = usePolling(fetchCosts, 60_000)
  const { data: tasks } = usePolling(fetchTasks, 60_000)
  const { data: health } = usePolling(fetchHealth, 30_000)
  const { data: actionsData } = usePolling(fetchActions, 30_000)
  const { data: allActionsData } = usePolling(fetchAllActions, 120_000)
  const { data: timerActive } = usePolling(fetchTimerActive, 10_000)
  const { data: timerSummary } = usePolling(fetchTimerSummary, 10_000)
  const { data: timerStats } = usePolling(fetchTimerStats, 60_000)
  const { data: fileCounts } = usePolling(fetchFileCounts, 120_000)
  const { projects, getProjectColor } = useProjects()

  // Live ticking clocks for all active timers
  const [tick, setTick] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (timerActive && timerActive.length > 0) {
      timerRef.current = setInterval(() => setTick(t => t + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerActive])

  const latest = heartbeats?.[0]
  const statusConfig = latest ? STATUS_CONFIG[latest.status] : STATUS_CONFIG.idle
  const isStale = latest
    ? Date.now() - new Date(latest.timestamp).getTime() > 120_000
    : true

  const activeTasks = (tasks || []).filter(t => t.status === 'in_progress')
  const inboxCount = (tasks || []).filter(t => t.status === 'inbox').length
  const blockedCount = (tasks || []).filter(t => t.status === 'blocked').length
  const completedToday = (tasks || []).filter(t => {
    if (t.status !== 'complete') return false
    const today = new Date().toISOString().split('T')[0]
    return t.updated_at.startsWith(today)
  }).length

  const budgetPct = costs?.budget_pct || 0
  const barColor = budgetPct >= 100 ? 'bg-red-500' : budgetPct >= 90 ? 'bg-red-400' : budgetPct >= 75 ? 'bg-yellow-500' : 'bg-green-500'

  const integrationsUp = health?.health?.integrations
    ? Object.values(health.health.integrations).filter(i => i.status === 'up').length
    : 0
  const integrationsTotal = health?.health?.integrations
    ? Object.keys(health.health.integrations).length
    : 0

  return (
    <div>
      {/* Header with live status */}
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

      {/* Budget alert */}
      {budgetPct >= 75 && (
        <div className={clsx(
          'rounded-lg px-4 py-3 mb-6 flex items-center gap-2 border',
          budgetPct >= 100 ? 'bg-red-500/10 border-red-500/30' : budgetPct >= 90 ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'
        )}>
          <AlertTriangle size={16} className={budgetPct >= 90 ? 'text-red-400' : 'text-yellow-400'} />
          <span className={clsx('text-sm', budgetPct >= 90 ? 'text-red-300' : 'text-yellow-300')}>
            {budgetPct >= 100 ? 'Over budget!' : budgetPct >= 90 ? 'Critical: 90%+ of budget used' : 'Warning: 75%+ of budget used'}
            {' — '}${costs?.total_spend?.toFixed(2)} of ${costs?.budget}
          </span>
        </div>
      )}

      {/* Stale heartbeat alert */}
      {health?.heartbeat_stale && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
          <Heart size={16} className="text-red-400" />
          <span className="text-sm text-red-300">
            Heartbeat stale — last seen {health.last_heartbeat
              ? formatDistanceToNow(new Date(health.last_heartbeat.timestamp), { addSuffix: true })
              : 'never'}
          </span>
        </div>
      )}

      {/* Current task */}
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

      {/* Timer widget */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer size={14} className={timerActive && timerActive.length > 0 ? 'text-green-400' : 'text-zinc-500'} />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Time Tracker</span>
          </div>
          {timerActive && timerActive.length > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {timerActive.length} active
            </span>
          )}
        </div>

        {(() => {
          const activeProjects = new Set((timerActive || []).map(t => t.project))
          const summaryMap = new Map((timerSummary || []).map(s => [s.project, s.totalToday]))
          // Merge: active timers first, then completed-only projects
          const allProjects: { project: string; active: boolean; startedAt?: string; totalToday: number }[] = []

          // Active timers
          for (const t of timerActive || []) {
            allProjects.push({
              project: t.project,
              active: true,
              startedAt: t.startedAt,
              totalToday: summaryMap.get(t.project) || 0,
            })
          }

          // Completed-only projects from summary
          for (const s of timerSummary || []) {
            if (!activeProjects.has(s.project)) {
              allProjects.push({
                project: s.project,
                active: false,
                totalToday: s.totalToday,
              })
            }
          }

          if (allProjects.length === 0) {
            return (
              <div className="text-center py-4">
                <Square size={20} className="text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No timer activity today</p>
              </div>
            )
          }

          const grandTotal = allProjects.reduce((sum, p) => {
            if (p.active && p.startedAt) {
              return sum + Math.round((Date.now() - new Date(p.startedAt).getTime()) / 1000)
            }
            return sum + p.totalToday
          }, 0)

          return (
            <div className="space-y-1">
              {allProjects.map((p, i) => {
                const liveElapsed = p.active && p.startedAt
                  ? Math.round((Date.now() - new Date(p.startedAt).getTime()) / 1000)
                  : 0
                // Use tick to force re-render
                void tick

                return (
                  <div key={i} className={clsx(
                    'flex items-center justify-between py-2.5 px-3 rounded-lg',
                    p.active ? 'bg-green-500/5 border border-green-500/10' : 'hover:bg-zinc-800/50'
                  )}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {p.active && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />}
                      <span className={clsx('text-sm truncate', p.active ? 'text-white font-medium' : 'text-zinc-400')}>
                        {p.project}
                      </span>
                    </div>
                    <span className={clsx(
                      'font-mono text-sm tabular-nums flex-shrink-0 ml-3',
                      p.active ? 'text-green-400 font-semibold' : 'text-zinc-500'
                    )}>
                      {formatDuration(p.active ? liveElapsed : p.totalToday)}
                    </span>
                  </div>
                )
              })}

              {/* Daily total */}
              <div className="flex items-center justify-between pt-3 mt-2 border-t border-zinc-800">
                <span className="text-xs text-zinc-500">Today&apos;s total</span>
                <span className="text-sm font-mono font-semibold text-zinc-300 tabular-nums">
                  {formatDuration(grandTotal)}
                </span>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Time Distribution Pie Chart + Project Time Stats */}
      {timerStats && timerStats.projects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon size={14} className="text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Time Distribution (This Week)</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timerStats.projects.filter(p => p.week > 0).map(p => ({
                      name: p.project,
                      value: p.week,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {timerStats.projects.filter(p => p.week > 0).map((p) => (
                      <Cell key={p.project} fill={getProjectColor(p.project)} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null
                      const d = payload[0]
                      return (
                        <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
                          <p className="text-white font-medium">{d.name}</p>
                          <p className="text-zinc-400">{formatDuration(d.value as number)}</p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-2">
              {timerStats.projects.filter(p => p.week > 0).map((p) => {
                const color = getProjectColor(p.project)
                return (
                  <div key={p.project} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    <span className="text-xs text-zinc-400">{p.project}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Project Time Breakdown Table */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} className="text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Time per Project</span>
            </div>
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-5 gap-2 text-xs text-zinc-500 pb-2 border-b border-zinc-800">
                <span className="col-span-1">Project</span>
                <span className="text-right">Today</span>
                <span className="text-right">Week</span>
                <span className="text-right">Month</span>
                <span className="text-right">Year</span>
              </div>
              {timerStats.projects
                .sort((a, b) => b.week - a.week)
                .map(p => {
                  const color = getProjectColor(p.project)
                  return (
                    <div key={p.project} className="grid grid-cols-5 gap-2 py-2 text-sm items-center">
                      <div className="col-span-1 flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-zinc-300 truncate text-xs">{p.project}</span>
                      </div>
                      <span className="text-right font-mono text-xs text-zinc-400 tabular-nums">{formatDuration(p.today)}</span>
                      <span className="text-right font-mono text-xs text-zinc-400 tabular-nums">{formatDuration(p.week)}</span>
                      <span className="text-right font-mono text-xs text-zinc-400 tabular-nums">{formatDuration(p.month)}</span>
                      <span className="text-right font-mono text-xs text-zinc-400 tabular-nums">{formatDuration(p.year)}</span>
                    </div>
                  )
                })}
              {/* Totals row */}
              <div className="grid grid-cols-5 gap-2 pt-2 border-t border-zinc-800 text-sm items-center">
                <span className="col-span-1 text-xs font-semibold text-zinc-400">Total</span>
                <span className="text-right font-mono text-xs font-semibold text-zinc-300 tabular-nums">{formatDuration(timerStats.totals.today)}</span>
                <span className="text-right font-mono text-xs font-semibold text-zinc-300 tabular-nums">{formatDuration(timerStats.totals.week)}</span>
                <span className="text-right font-mono text-xs font-semibold text-zinc-300 tabular-nums">{formatDuration(timerStats.totals.month)}</span>
                <span className="text-right font-mono text-xs font-semibold text-zinc-300 tabular-nums">{formatDuration(timerStats.totals.year)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href="/costs" className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-zinc-500" />
            <span className="text-xs text-zinc-500">Monthly Spend</span>
          </div>
          <p className="text-2xl font-bold text-white">${costs?.total_spend?.toFixed(2) || '0.00'}</p>
          <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className={clsx('h-full rounded-full', barColor)} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
          </div>
          <p className="text-xs text-zinc-500 mt-1">{budgetPct}% of ${costs?.budget || 150}</p>
          <p className="text-xs mt-1" style={{ color: costs?.source === 'codexbar' ? '#10b981' : '#6b7280' }}>
            {costs?.source === 'codexbar' ? 'CodexBar (Claude + Codex)' : 'Session spend'}
          </p>
        </Link>

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
            <p className="text-2xl font-bold text-white">{health?.health?.cpu_pct?.toFixed(0) ?? '—'}%</p>
            <span className="text-xs text-zinc-500">CPU</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
            <span>RAM {health?.health?.ram_pct?.toFixed(0) ?? '—'}%</span>
            <span>Disk {health?.health?.disk_pct?.toFixed(0) ?? '—'}%</span>
          </div>
        </Link>

        <Link href="/health" className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={14} className="text-zinc-500" />
            <span className="text-xs text-zinc-500">Integrations</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {integrationsTotal > 0 ? `${integrationsUp}/${integrationsTotal}` : '—'}
          </p>
          <p className="text-xs mt-2 text-zinc-400">
            {integrationsUp === integrationsTotal && integrationsTotal > 0
              ? <span className="text-green-400">All connected</span>
              : integrationsTotal > 0
                ? <span className="text-yellow-400">{integrationsTotal - integrationsUp} down</span>
                : 'No data'}
          </p>
        </Link>
      </div>

      {/* Two columns: Active Tasks + Recent Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Active Tasks</h3>
            <Link href="/tasks" className="text-xs text-indigo-400 hover:text-indigo-300">View all</Link>
          </div>
          {activeTasks.length === 0 ? (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 text-center text-zinc-500 text-sm">
              No tasks in progress
            </div>
          ) : (
            <div className="space-y-2">
              {activeTasks.slice(0, 5).map(task => (
                <div key={task.id} className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: PRIORITY_COLORS[task.priority] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.project_tag && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{
                            background: `${getProjectColor(task.project_tag!)}20`,
                            color: getProjectColor(task.project_tag!)
                          }}>
                            {task.project_tag}
                          </span>
                        )}
                        <span className="text-xs text-zinc-500">{TASK_STATUS_LABELS[task.status]}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Actions */}
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

      {/* Projects Breakdown */}
      {(() => {
        const allActions = allActionsData?.actions || []
        const allTasks = tasks || []
        const timeByProject = timerStats?.projects || []

        // Build stats for all known projects from DB
        const projectStats: Record<string, { actions: number; tasks: number; active: number; completed: number; files: number; timeMonth: number }> = {}

        // Initialize from projects list (so all projects show)
        for (const p of projects) {
          projectStats[p.name] = { actions: 0, tasks: 0, active: 0, completed: 0, files: 0, timeMonth: 0 }
        }

        // Only count data for registered projects
        const registeredNames = new Set(projects.map(p => p.name))

        // Count actions per project (only registered)
        allActions.forEach(a => {
          const tag = a.project_tag
          if (!tag || !registeredNames.has(tag)) return
          projectStats[tag].actions++
        })

        // Count tasks per project (only registered)
        allTasks.forEach(t => {
          const tag = t.project_tag
          if (!tag || !registeredNames.has(tag)) return
          projectStats[tag].tasks++
          if (t.status === 'in_progress') projectStats[tag].active++
          if (t.status === 'complete') projectStats[tag].completed++
        })

        // Merge file counts from project records
        for (const p of projects) {
          if (p.file_count != null) {
            projectStats[p.name].files = p.file_count
          }
        }

        // Merge time data (only registered)
        for (const tp of timeByProject) {
          if (!registeredNames.has(tp.project)) continue
          projectStats[tp.project].timeMonth = tp.month
        }

        const entries = Object.entries(projectStats)
          .sort((a, b) => b[1].timeMonth - a[1].timeMonth || b[1].actions - a[1].actions)

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
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock size={12} className="text-zinc-500" />
                      <span className="text-xs font-mono text-zinc-300 tabular-nums">{stats.timeMonth > 0 ? formatHoursMinutes(stats.timeMonth) : '\u2014'}</span>
                      <span className="text-xs text-zinc-600">this month</span>
                    </div>
                    <div className="flex items-center flex-wrap gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <FileText size={11} />
                        {stats.files > 0 ? `${stats.files} files` : '\u2014'}
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

      {/* Recent Activity (last 5 heartbeats) */}
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
