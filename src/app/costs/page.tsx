'use client'

import { useCallback } from 'react'
import { usePolling } from '@/hooks/usePolling'
import { PageHeader } from '@/components/PageHeader'
import { clsx } from 'clsx'
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface CostData {
  total_spend: number
  budget: number
  budget_pct: number
  projected_spend: number
  budget_remaining: number
  by_model: Record<string, { cost: number; tokens_in: number; tokens_out: number }>
  by_day: Record<string, number>
}

const MODEL_COLORS: Record<string, string> = {
  'claude-opus-4-6': '#8b5cf6',
  'claude-sonnet-4-6': '#6366f1',
  'claude-haiku-4-5': '#3b82f6',
  'grok': '#f59e0b',
}

export default function CostsPage() {
  const fetchCosts = useCallback(async () => {
    const res = await fetch('/api/cost')
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json() as Promise<CostData>
  }, [])

  const { data, loading } = usePolling(fetchCosts, 60_000)

  const budgetPct = data?.budget_pct || 0
  const barColor = budgetPct >= 100 ? 'bg-red-500' : budgetPct >= 90 ? 'bg-red-400' : budgetPct >= 75 ? 'bg-yellow-500' : 'bg-green-500'

  const dailyData = data?.by_day
    ? Object.entries(data.by_day).map(([date, cost]) => ({
        date: date.slice(5), // MM-DD
        cost: Math.round(cost * 100) / 100,
      }))
    : []

  const modelData = data?.by_model
    ? Object.entries(data.by_model).map(([model, info]) => ({
        name: model.replace('claude-', '').replace(/-/g, ' '),
        value: Math.round(info.cost * 100) / 100,
        tokens_in: info.tokens_in,
        tokens_out: info.tokens_out,
        model,
      }))
    : []

  return (
    <div>
      <PageHeader title="Cost Tracker" subtitle={`$${data?.budget || 150}/month budget`} />

      {budgetPct >= 75 && (
        <div className={clsx(
          'rounded-lg px-4 py-3 mb-6 flex items-center gap-2 border',
          budgetPct >= 100 ? 'bg-red-500/10 border-red-500/30' : budgetPct >= 90 ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'
        )}>
          <AlertTriangle size={16} className={budgetPct >= 90 ? 'text-red-400' : 'text-yellow-400'} />
          <span className={clsx('text-sm', budgetPct >= 90 ? 'text-red-300' : 'text-yellow-300')}>
            {budgetPct >= 100 ? 'Over budget!' : budgetPct >= 90 ? 'Critical: 90%+ of budget used' : 'Warning: 75%+ of budget used'}
          </span>
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-500 py-12">Loading...</div>
      ) : (
        <>
          {/* Budget Bar */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-zinc-400">Monthly Spend</p>
                <p className="text-3xl font-bold text-white">${data?.total_spend?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-400">Remaining</p>
                <p className={clsx('text-xl font-semibold', (data?.budget_remaining || 0) > 0 ? 'text-green-400' : 'text-red-400')}>
                  ${data?.budget_remaining?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden relative">
              <div className={clsx('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
              {/* Threshold markers */}
              <div className="absolute top-0 left-[75%] w-px h-full bg-zinc-600" />
              <div className="absolute top-0 left-[90%] w-px h-full bg-zinc-600" />
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-500">
              <span>$0</span>
              <span>${data?.budget || 150}</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-zinc-500" />
                <p className="text-sm text-zinc-400">Projected</p>
              </div>
              <p className="text-xl font-bold text-white">${data?.projected_spend?.toFixed(2) || '—'}</p>
            </div>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={14} className="text-zinc-500" />
                <p className="text-sm text-zinc-400">Daily Average</p>
              </div>
              <p className="text-xl font-bold text-white">
                ${data ? (data.total_spend / Math.max(1, new Date().getDate())).toFixed(2) : '—'}
              </p>
            </div>
          </div>

          {/* Daily Spend Chart */}
          {dailyData.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 mb-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Daily Spend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#a1a1aa' }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Cost']}
                  />
                  <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Model Breakdown */}
          {modelData.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">By Model</h3>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={modelData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2}>
                      {modelData.map((entry) => (
                        <Cell key={entry.model} fill={MODEL_COLORS[entry.model] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Cost']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-3">
                  {modelData.map(m => (
                    <div key={m.model} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: MODEL_COLORS[m.model] || '#6b7280' }} />
                        <span className="text-sm text-zinc-300">{m.name}</span>
                      </div>
                      <span className="text-xs text-zinc-500">
                        {(m.tokens_in / 1000).toFixed(1)}k in / {(m.tokens_out / 1000).toFixed(1)}k out
                      </span>
                      <span className="text-sm font-semibold text-white">${m.value.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!dailyData.length && !modelData.length && (
            <div className="text-center text-zinc-500 py-12">No cost data yet. Costs appear after Lupe logs sessions.</div>
          )}
        </>
      )}
    </div>
  )
}
