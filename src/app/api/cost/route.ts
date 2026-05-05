import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json()

  // CodexBar format: { month, provider, cost_usd, tokens_total?, payload? }
  if (body.month && body.provider) {
    const { month, provider, cost_usd, tokens_total, payload } = body

    if (!cost_usd && cost_usd !== 0) {
      return NextResponse.json({ error: 'cost_usd is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('codexbar_costs')
      .insert({
        month,
        provider,
        cost_usd,
        tokens_total: tokens_total || null,
        payload: payload || null,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, source: 'codexbar' })
  }

  // Legacy session cost format: { session_id, model, tokens_in, tokens_out, cost_usd }
  const { session_id, model, tokens_in, tokens_out, cost_usd } = body

  if (!model || cost_usd === undefined) {
    return NextResponse.json({ error: 'model and cost_usd are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('cost_entries')
    .insert({ session_id, model, tokens_in: tokens_in || 0, tokens_out: tokens_out || 0, cost_usd })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Check budget thresholds
  const budget = Number(process.env.MONTHLY_BUDGET_USD || 150)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: monthData } = await supabaseAdmin
    .from('cost_entries')
    .select('cost_usd')
    .gte('created_at', monthStart)

  const totalSpend = (monthData || []).reduce((sum, e) => sum + Number(e.cost_usd), 0)
  const pct = (totalSpend / budget) * 100

  let budget_alert: string | null = null
  if (pct >= 100) budget_alert = 'over_budget'
  else if (pct >= 90) budget_alert = 'critical'
  else if (pct >= 75) budget_alert = 'warning'

  return NextResponse.json({ ok: true, total_spend: totalSpend, budget_pct: Math.round(pct), budget_alert })
}

export async function GET() {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const budget = Number(process.env.MONTHLY_BUDGET_USD || 150)

  // Try CodexBar data first (primary source)
  const { data: codexbarRows } = await supabaseAdmin
    .from('codexbar_costs')
    .select('*')
    .eq('month', currentMonth)
    .order('reported_at', { ascending: false })

  const hasCodexbar = codexbarRows && codexbarRows.length > 0

  // Also fetch session cost entries
  const { data: entries, error } = await supabaseAdmin
    .from('cost_entries')
    .select('*')
    .gte('created_at', monthStart)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Session spend (legacy)
  const sessionSpend = entries.reduce((sum, e) => sum + Number(e.cost_usd), 0)

  // CodexBar spend: sum latest row per provider
  let codexbarSpend = 0
  const byProvider: Record<string, { cost: number; tokens_total: number; reported_at: string }> = {}
  if (hasCodexbar) {
    // Take the most recent entry per provider
    for (const row of codexbarRows) {
      if (!byProvider[row.provider]) {
        byProvider[row.provider] = {
          cost: Number(row.cost_usd),
          tokens_total: row.tokens_total || 0,
          reported_at: row.reported_at,
        }
      }
    }
    codexbarSpend = Object.values(byProvider).reduce((sum, p) => sum + p.cost, 0)
  }

  // Primary spend is CodexBar if available, otherwise session spend
  const totalSpend = hasCodexbar ? codexbarSpend : sessionSpend
  const source = hasCodexbar ? 'codexbar' : 'sessions'

  const daysElapsed = Math.max(1, now.getDate())
  const dailyAvg = totalSpend / daysElapsed
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projectedSpend = dailyAvg * daysInMonth

  // Group session entries by model
  const byModel: Record<string, { cost: number; tokens_in: number; tokens_out: number }> = {}
  entries.forEach(e => {
    if (!byModel[e.model]) byModel[e.model] = { cost: 0, tokens_in: 0, tokens_out: 0 }
    byModel[e.model].cost += Number(e.cost_usd)
    byModel[e.model].tokens_in += e.tokens_in
    byModel[e.model].tokens_out += e.tokens_out
  })

  // Group by day
  const byDay: Record<string, number> = {}
  entries.forEach(e => {
    const day = e.created_at.split('T')[0]
    byDay[day] = (byDay[day] || 0) + Number(e.cost_usd)
  })

  const pct = (totalSpend / budget) * 100

  return NextResponse.json({
    total_spend: totalSpend,
    budget,
    budget_pct: Math.round(pct),
    projected_spend: Math.round(projectedSpend * 100) / 100,
    budget_remaining: Math.round((budget - totalSpend) * 100) / 100,
    source,
    codexbar_spend: codexbarSpend,
    session_spend: sessionSpend,
    by_provider: hasCodexbar ? byProvider : undefined,
    by_model: byModel,
    by_day: byDay,
  })
}
