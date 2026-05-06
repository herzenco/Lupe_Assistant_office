import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const status = searchParams.get('status') || 'all'
  const days = parseInt(searchParams.get('days') || '7', 10)

  const since = new Date()
  since.setDate(since.getDate() - days)

  let query = supabaseAdmin
    .from('cron_runs')
    .select('*')
    .gte('ran_at', since.toISOString())
    .order('ran_at', { ascending: false })

  if (status === 'error') {
    query = query.eq('status', 'error')
  } else if (status === 'timeout') {
    query = query.eq('status', 'timeout')
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Count errors/timeouts in last 24h for badge
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)

  const { count: alertCount } = await supabaseAdmin
    .from('cron_runs')
    .select('*', { count: 'exact', head: true })
    .gte('ran_at', oneDayAgo.toISOString())
    .in('status', ['error', 'timeout'])

  return NextResponse.json({
    runs: data || [],
    alertCount: alertCount || 0,
  })
}
