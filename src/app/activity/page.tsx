'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePolling } from '@/hooks/usePolling'
import { PageHeader } from '@/components/PageHeader'
import { formatDistanceToNow } from 'date-fns'
import type { Heartbeat } from '@/lib/types'
import { Activity, Cpu, Clock, Zap } from 'lucide-react'
import { clsx } from 'clsx'

const STATUS_CONFIG = {
  active: { color: 'bg-green-500', label: 'Active', ring: 'ring-green-500/30' },
  idle: { color: 'bg-zinc-500', label: 'Idle', ring: 'ring-zinc-500/30' },
  error: { color: 'bg-red-500', label: 'Error', ring: 'ring-red-500/30' },
}

const ACTION_ICONS: Record<string, string> = {
  session_start: '🟢',
  session_end: '🔴',
  model_switch: '🔄',
  task_started: '📋',
  task_completed: '✅',
  task_blocked: '🚫',
  tool_used: '🔧',
  file_created: '📄',
  email_drafted: '✉️',
  error: '⚠️',
  cost_logged: '💰',
}

export default function ActivityFeed() {
  const fetchHeartbeats = useCallback(async () => {
    const res = await fetch('/api/heartbeat')
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json() as Promise<Heartbeat[]>
  }, [])

  const { data: heartbeats, loading } = usePolling(fetchHeartbeats, 30_000)
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

  return (
    <div>
      <PageHeader title="Activity Feed" subtitle="Real-time view of what Lupe is doing" />

      {/* Status Card */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className={clsx('w-4 h-4 rounded-full ring-4', statusConfig.color, statusConfig.ring, !isStale && latest?.status === 'active' && 'animate-pulse')} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-white">
                {isStale ? 'Offline' : statusConfig.label}
              </span>
              {latest && (
                <span className="text-xs text-zinc-500">
                  {formatDistanceToNow(new Date(latest.timestamp), { addSuffix: true })}
                </span>
              )}
            </div>
            {latest?.task && !isStale && (
              <p className="text-sm text-zinc-300 mt-1">{latest.task}</p>
            )}
          </div>
        </div>

        {latest && !isStale && (
          <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Model</p>
                <p className="text-sm font-medium text-zinc-200">{latest.model || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Session</p>
                <p className="text-sm font-medium text-zinc-200">{latest.session_type || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Tokens</p>
                <p className="text-sm font-medium text-zinc-200">
                  {latest.tokens_in + latest.tokens_out > 0
                    ? `${((latest.tokens_in + latest.tokens_out) / 1000).toFixed(1)}k`
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Recent Activity</h3>

      {loading ? (
        <div className="text-center text-zinc-500 py-12">Loading...</div>
      ) : !heartbeats?.length ? (
        <div className="text-center text-zinc-500 py-12">No activity yet. Lupe hasn&apos;t sent any heartbeats.</div>
      ) : (
        <div className="space-y-1">
          {heartbeats.map((hb) => (
            <div key={hb.id} className="flex items-start gap-3 py-3 px-4 rounded-lg hover:bg-zinc-900/50 transition-colors">
              <div className="flex-shrink-0 mt-0.5 text-base">
                {ACTION_ICONS[hb.action_type || ''] || '📡'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-zinc-200">
                    {hb.action_type?.replace(/_/g, ' ') || hb.status}
                  </span>
                  {hb.model && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{hb.model}</span>
                  )}
                </div>
                {(hb.task || hb.detail) && (
                  <p className="text-sm text-zinc-400 mt-0.5 truncate">{hb.detail || hb.task}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Clock size={12} className="text-zinc-600" />
                <span className="text-xs text-zinc-500">
                  {formatDistanceToNow(new Date(hb.timestamp), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
