'use client'

import { useCallback } from 'react'
import { usePolling } from '@/hooks/usePolling'
import { PageHeader } from '@/components/PageHeader'
import { formatDistanceToNow } from 'date-fns'
import { Cpu, HardDrive, MemoryStick, Wifi, WifiOff, Clock } from 'lucide-react'
import { clsx } from 'clsx'

interface HealthData {
  health: {
    machine_id: string | null
    agent_name: string | null
    hostname: string | null
    cpu_pct: number | null
    ram_pct: number | null
    disk_pct: number | null
    gateway_status: string
    drive_status: string
    integrations: Record<string, { status: string; last_checked?: string; reason?: string; path?: string }>
    timestamp: string
  } | null
  last_heartbeat: { timestamp: string; status: string } | null
  uptime_seconds: number | null
  heartbeat_stale: boolean
}

function MetricGauge({ label, value, icon: Icon }: { label: string; value: number | null; icon: React.ComponentType<{ size: number; className?: string }> }) {
  const pct = value ?? 0
  const color = pct > 90 ? 'text-red-400' : pct > 70 ? 'text-yellow-400' : 'text-green-400'
  const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-zinc-500" />
        <span className="text-sm font-medium text-zinc-400">{label}</span>
      </div>
      <p className={clsx('text-3xl font-bold', value !== null ? color : 'text-zinc-600')}>
        {value !== null ? `${value.toFixed(0)}%` : '—'}
      </p>
      <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function statusTone(status?: string) {
  if (status === 'up') return { dot: 'bg-green-500', text: 'text-green-400', label: 'Connected' }
  if (status === 'down') return { dot: 'bg-red-500', text: 'text-red-400', label: 'Offline' }
  return { dot: 'bg-zinc-600', text: 'text-zinc-500', label: 'Not configured' }
}

export default function HealthPage() {
  const fetchHealth = useCallback(async () => {
    const res = await fetch('/api/health')
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json() as Promise<HealthData>
  }, [])

  const { data, loading } = usePolling(fetchHealth, 30_000)

  const integrations = data?.health?.integrations || {}
  const reportedBy = data?.health?.agent_name || data?.health?.machine_id || data?.health?.hostname
  const integrationList = [
    { name: 'Google Calendar', key: 'google_calendar' },
    { name: 'Google Drive', key: 'google_drive' },
    { name: 'GitHub', key: 'github' },
    { name: 'ClickUp', key: 'clickup' },
    { name: 'Telegram', key: 'telegram' },
  ]

  return (
    <div>
      <PageHeader title="System Health" subtitle="Lupe's environment and integration status" />

      {data?.heartbeat_stale && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6 flex items-center gap-2">
          <WifiOff size={16} className="text-red-400" />
          <span className="text-sm text-red-300">
            Heartbeat stale — last seen {data.last_heartbeat
              ? formatDistanceToNow(new Date(data.last_heartbeat.timestamp), { addSuffix: true })
              : 'never'}
          </span>
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-500 py-12">Loading...</div>
      ) : (
        <>
          {/* System Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <MetricGauge label="CPU" value={data?.health?.cpu_pct ?? null} icon={Cpu} />
            <MetricGauge label="Memory" value={data?.health?.ram_pct ?? null} icon={MemoryStick} />
            <MetricGauge label="Disk" value={data?.health?.disk_pct ?? null} icon={HardDrive} />
          </div>

          {/* Status Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <p className="text-sm text-zinc-400 mb-1">Gateway</p>
              <div className="flex items-center gap-2">
                <div className={clsx('w-2.5 h-2.5 rounded-full', statusTone(data?.health?.gateway_status).dot)} />
                <span className="text-lg font-semibold text-white capitalize">{data?.health?.gateway_status || 'Unknown'}</span>
              </div>
            </div>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <p className="text-sm text-zinc-400 mb-1">Drive Sync</p>
              <div className="flex items-center gap-2">
                <div className={clsx('w-2.5 h-2.5 rounded-full', statusTone(data?.health?.drive_status).dot)} />
                <span className="text-lg font-semibold text-white capitalize">{data?.health?.drive_status || 'Unknown'}</span>
              </div>
            </div>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={14} className="text-zinc-500" />
                <p className="text-sm text-zinc-400">Uptime</p>
              </div>
              <span className="text-lg font-semibold text-white">
                {data?.uptime_seconds ? formatUptime(data.uptime_seconds) : '—'}
              </span>
            </div>
          </div>

          {/* Health Source */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5 mb-8">
            <p className="text-sm text-zinc-400 mb-1">Health Report Source</p>
            <p className="text-lg font-semibold text-white">{reportedBy || 'No Lupe machine has reported yet'}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {data?.health?.timestamp
                ? `Last checked ${formatDistanceToNow(new Date(data.health.timestamp), { addSuffix: true })}`
                : 'Waiting for the configured Lupe machine to send a heartbeat'}
            </p>
          </div>

          {/* Integrations */}
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Integrations</h3>
          <div className="space-y-2">
            {integrationList.map(({ name, key }) => {
              const info = integrations[key]
              const tone = statusTone(info?.status)
              return (
                <div key={key} className="flex items-center justify-between bg-zinc-900 rounded-lg border border-zinc-800 px-4 py-3">
                  <div className="flex items-center gap-3">
                    {info?.status === 'up' ? <Wifi size={16} className="text-green-400" /> : <WifiOff size={16} className={tone.text} />}
                    <div>
                      <span className="text-sm font-medium text-zinc-200">{name}</span>
                      {(info?.reason || info?.path) && (
                        <p className="text-xs text-zinc-600 mt-0.5">{info.path || info.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={clsx('text-xs', tone.text)}>
                      {tone.label}
                    </span>
                    {info?.last_checked && (
                      <span className="text-xs text-zinc-600">
                        {formatDistanceToNow(new Date(info.last_checked), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
