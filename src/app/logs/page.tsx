'use client'

import { useCallback, useState } from 'react'
import { usePolling } from '@/hooks/usePolling'
import { PageHeader } from '@/components/PageHeader'
import { format } from 'date-fns'
import { clsx } from 'clsx'
import { ScrollText, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface CronRun {
  id: string
  job_id: string
  job_name: string
  status: 'ok' | 'error' | 'timeout'
  error: string | null
  duration_ms: number | null
  delivered: boolean
  ran_at: string
}

interface LogsResponse {
  runs: CronRun[]
  alertCount: number
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  ok: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'OK' },
  error: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Error' },
  timeout: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'Timeout' },
}

type FilterStatus = 'all' | 'error' | 'timeout'

export default function LogsPage() {
  const [filter, setFilter] = useState<FilterStatus>('all')

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams({ days: '7' })
    if (filter !== 'all') params.set('status', filter)
    const res = await fetch(`/api/logs?${params}`)
    return res.ok ? (res.json() as Promise<LogsResponse>) : null
  }, [filter])

  const { data } = usePolling(fetchLogs, 30_000)
  const runs = data?.runs || []

  const filters: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'error', label: 'Errors' },
    { value: 'timeout', label: 'Timeouts' },
  ]

  return (
    <div>
      <PageHeader title="Cron Logs" subtitle="Job execution history (last 7 days)" />

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-6">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              filter === f.value
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {runs.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
          <ScrollText size={28} className="text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No cron logs yet</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Job Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Time (ET)</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Error</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Delivered</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => {
                  const badge = STATUS_BADGE[run.status] || STATUS_BADGE.ok
                  return (
                    <tr key={run.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 text-zinc-200 font-medium">{run.job_name}</td>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                        {format(new Date(run.ran_at), 'MMM d, HH:mm:ss')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', badge.bg, badge.text)}>
                          {run.status === 'ok' && <CheckCircle2 size={11} />}
                          {run.status === 'error' && <XCircle size={11} />}
                          {run.status === 'timeout' && <Clock size={11} />}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 font-mono text-xs">
                        {run.duration_ms != null ? `${run.duration_ms}ms` : '\u2014'}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs max-w-xs truncate">
                        {run.error || '\u2014'}
                      </td>
                      <td className="px-4 py-3">
                        {run.delivered ? (
                          <span className="text-green-400 text-xs">Yes</span>
                        ) : (
                          <span className="text-zinc-500 text-xs">No</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
