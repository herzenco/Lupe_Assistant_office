import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { session_id, model, tokens_in, tokens_out, cost_usd } = await request.json()

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
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const budget = Number(process.env.MONTHLY_BUDGET_USD || 150)

  const { data: entries, error } = await supabaseAdmin
    .from('cost_entries')
    .select('*')
    .gte('created_at', monthStart)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const totalSpend = entries.reduce((sum, e) => sum + Number(e.cost_usd), 0)
  const daysElapsed = Math.max(1, now.getDate())
  const dailyAvg = totalSpend / daysElapsed
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projectedSpend = dailyAvg * daysInMonth

  // Group by model
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
    by_model: byModel,
    by_day: byDay,
  })
}
