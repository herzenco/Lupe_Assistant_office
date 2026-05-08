'use client'

import { useCallback, useState, useEffect } from 'react'
import { usePolling } from '@/hooks/usePolling'
import { formatDistanceToNow, format } from 'date-fns'
import type { Heartbeat, Task, Action } from '@/lib/types'
import { TASK_STATUS_LABELS, PRIORITY_COLORS, ACTION_TYPE_LABELS, ACTION_TYPE_COLORS } from '@/lib/constants'
import { useProjects } from '@/hooks/useProjects'
import type { ActionType } from '@/lib/types'
import {
  Activity, Cpu, LayoutList, Clock,
  Heart, Briefcase,
  Timer, Square, PieChart as PieChartIcon, FileText, Play, StopCircle,
  ChevronDown
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

interface TimerActive {
  project: string
  startedAt: string
  elapsed: number
  running: true
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
  asOf: string
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

function TimeDistributionRing({
  projects,
  getProjectColor,
}: {
  projects: TimerStatsProject[]
  getProjectColor: (project: string) => string
}) {
  const data = projects.filter(p => p.week > 0)
  const total = data.reduce((sum, p) => sum + p.week, 0)
  const radius = 58
  const circumference = 2 * Math.PI * radius
  const segments = data.reduce<Array<{ project: TimerStatsProject; length: number; offset: number }>>((items, project) => {
    const length = (project.week / total) * circumference
    const offset = items.reduce((sum, item) => sum + item.length, 0)
    return [...items, { project, length, offset }]
  }, [])

  if (total === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-zinc-500">
        No tracked time this week
      </div>
    )
  }

  return (
    <div className="h-48 flex items-center justify-center">
      <svg viewBox="0 0 160 160" role="img" aria-label="Time distribution this week" className="h-40 w-40 overflow-visible">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgb(39 39 42)" strokeWidth="28" />
        {segments.map(({ project, length, offset }) => (
            <circle
              key={project.project}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={getProjectColor(project.project)}
              strokeWidth="28"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 80 80)"
            >
              <title>{`${project.project}: ${formatDuration(project.week)}`}</title>
            </circle>
        ))}
      </svg>
    </div>
  )
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

  const { data: heartbeats } = usePolling(fetchHeartbeats, 30_000)
  const { data: tasks } = usePolling(fetchTasks, 60_000)
  const { data: health } = usePolling(fetchHealth, 30_000)
  const { data: actionsData } = usePolling(fetchActions, 30_000)
  const { data: allActionsData } = usePolling(fetchAllActions, 120_000)
  const { data: timerActive } = usePolling(fetchTimerActive, 10_000)
  const { data: timerSummary } = usePolling(fetchTimerSummary, 10_000)
  const { data: timerStats } = usePolling(fetchTimerStats, 60_000)
  const { projects, getProjectColor } = useProjects()

  // Timer controls state
  const [selectedProject, setSelectedProject] = useState('')
  const [timerLoading, setTimerLoading] = useState<string | null>(null)
  const [showProjectPicker, setShowProjectPicker] = useState(false)

  const fetchTimerRefresh = useCallback(async () => {
    // Trigger re-fetches after start/stop
    const [active, summary] = await Promise.all([fetchTimerActive(), fetchTimerSummary()])
    return { active, summary }
  }, [fetchTimerActive, fetchTimerSummary])

  const handleStartTimer = useCallback(async (project: string) => {
    if (!project) return
    setTimerLoading(project)
    try {
      const res = await fetch('/api/timer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('Failed to start timer:', err.error)
      }
    } finally {
      setTimerLoading(null)
      // Force refresh polling data
      await fetchTimerRefresh()
    }
  }, [fetchTimerRefresh])

  const handleStopTimer = useCallback(async (project: string) => {
    setTimerLoading(project)
    try {
      const res = await fetch('/api/timer/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('Failed to stop timer:', err.error)
      }
    } finally {
      setTimerLoading(null)
      await fetchTimerRefresh()
    }
  }, [fetchTimerRefresh])

  // Live ticking clocks for all active timers
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
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

  const liveTimerStats = (() => {
    if (!timerStats) return null
    const stats = {
      asOf: timerStats.asOf,
      projects: timerStats.projects.map(p => ({ ...p })),
      totals: { ...timerStats.totals },
    }
    const asOfMs = timerStats.asOf ? new Date(timerStats.asOf).getTime() : nowMs
    const liveDelta = Math.max(0, Math.round((nowMs - asOfMs) / 1000))
    if (liveDelta === 0) return stats

    for (const active of timerActive || []) {
      const startedAt = new Date(active.startedAt)
      let project = stats.projects.find(p => p.project === active.project)
      if (!project) {
        project = { project: active.project, today: 0, week: 0, month: 0, year: 0 }
        stats.projects.push(project)
      }

      project.year += liveDelta
      stats.totals.year += liveDelta

      const now = new Date(nowMs)
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      if (startedAt <= now && now >= monthStart) {
        project.month += liveDelta
        stats.totals.month += liveDelta
      }
      if (startedAt <= now && now >= weekStart) {
        project.week += liveDelta
        stats.totals.week += liveDelta
      }
      if (startedAt <= now && now >= todayStart) {
        project.today += liveDelta
        stats.totals.today += liveDelta
      }
    }

    return stats
  })()

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
          <div className="flex items-center gap-2">
            {timerActive && timerActive.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {timerActive.length} active
              </span>
            )}
          </div>
        </div>

        {/* Start timer control */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <button
              onClick={() => setShowProjectPicker(!showProjectPicker)}
              className="w-full flex items-center justify-between px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:border-zinc-600 transition-colors"
            >
              <span className={selectedProject ? 'text-white' : 'text-zinc-500'}>
                {selectedProject || 'Select project...'}
              </span>
              <ChevronDown size={14} className="text-zinc-500" />
            </button>
            {showProjectPicker && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {projects.map(p => {
                  const isActive = (timerActive || []).some(t => t.project === p.name)
                  return (
                    <button
                      key={p.slug}
                      onClick={() => { setSelectedProject(p.name); setShowProjectPicker(false) }}
                      className={clsx(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-700/50 transition-colors',
                        selectedProject === p.name && 'bg-zinc-700/30'
                      )}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getProjectColor(p.name) }} />
                      <span className="text-zinc-200">{p.name}</span>
                      {isActive && <span className="ml-auto text-xs text-green-400">running</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => { if (selectedProject) handleStartTimer(selectedProject) }}
            disabled={!selectedProject || timerLoading !== null}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedProject && !timerLoading
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            )}
          >
            <Play size={13} />
            Start
          </button>
        </div>

        {(() => {
          const activeProjects = new Set((timerActive || []).map(t => t.project))
          const summaryMap = new Map((timerSummary || []).map(s => [s.project, s.totalToday]))
          const allProjects: { project: string; active: boolean; startedAt?: string; totalToday: number }[] = []

          for (const t of timerActive || []) {
            allProjects.push({
              project: t.project,
              active: true,
              startedAt: t.startedAt,
              totalToday: summaryMap.get(t.project) || 0,
            })
          }

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
              return sum + Math.round((nowMs - new Date(p.startedAt).getTime()) / 1000)
            }
            return sum + p.totalToday
          }, 0)

          return (
            <div className="space-y-1">
              {allProjects.map((p, i) => {
                const liveElapsed = p.active && p.startedAt
                  ? Math.round((nowMs - new Date(p.startedAt).getTime()) / 1000)
                  : 0

                return (
                  <div key={i} className={clsx(
                    'flex items-center justify-between py-2.5 px-3 rounded-lg',
                    p.active ? 'bg-green-500/5 border border-green-500/10' : 'hover:bg-zinc-800/50'
                  )}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {p.active && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />}
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getProjectColor(p.project) }} />
                      <span className={clsx('text-sm truncate', p.active ? 'text-white font-medium' : 'text-zinc-400')}>
                        {p.project}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className={clsx(
                        'font-mono text-sm tabular-nums',
                        p.active ? 'text-green-400 font-semibold' : 'text-zinc-500'
                      )}>
                        {formatDuration(p.active ? liveElapsed : p.totalToday)}
                      </span>
                      {p.active ? (
                        <button
                          onClick={() => handleStopTimer(p.project)}
                          disabled={timerLoading === p.project}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium transition-colors"
                        >
                          <StopCircle size={12} />
                          Stop
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartTimer(p.project)}
                          disabled={timerLoading === p.project}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium transition-colors"
                        >
                          <Play size={12} />
                          Start
                        </button>
                      )}
                    </div>
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
      {liveTimerStats && liveTimerStats.projects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieChartIcon size={14} className="text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Time Distribution (This Week)</span>
            </div>
            <TimeDistributionRing projects={liveTimerStats.projects} getProjectColor={getProjectColor} />
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-2">
              {liveTimerStats.projects.filter(p => p.week > 0).map((p) => {
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
              {liveTimerStats.projects
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
                <span className="text-right font-mono text-xs font-semibold text-zinc-300 tabular-nums">{formatDuration(liveTimerStats.totals.today)}</span>
                <span className="text-right font-mono text-xs font-semibold text-zinc-300 tabular-nums">{formatDuration(liveTimerStats.totals.week)}</span>
                <span className="text-right font-mono text-xs font-semibold text-zinc-300 tabular-nums">{formatDuration(liveTimerStats.totals.month)}</span>
                <span className="text-right font-mono text-xs font-semibold text-zinc-300 tabular-nums">{formatDuration(liveTimerStats.totals.year)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
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
            <p className="text-2xl font-bold text-white">{displayHealth?.cpu_pct?.toFixed(0) ?? '—'}%</p>
            <span className="text-xs text-zinc-500">CPU</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
            <span>RAM {displayHealth?.ram_pct?.toFixed(0) ?? '—'}%</span>
            <span>Disk {displayHealth?.disk_pct?.toFixed(0) ?? '—'}%</span>
          </div>
          {!healthIsFresh && <p className="text-xs text-zinc-500 mt-2">No recent local metrics</p>}
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
                ? <span className="text-yellow-400">{integrationsTotal - integrationsUp} need attention</span>
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
        const timeByProject = liveTimerStats?.projects || []

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
