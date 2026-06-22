import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calculateTimerStats } from '@/lib/timerStats'

export const dynamic = 'force-dynamic'

export async function GET() {
  const asOf = new Date()
  const yearStart = new Date(asOf.getFullYear(), 0, 1)

  // Fetch sessions that overlap this year, including sessions started last year.
  const { data, error } = await supabaseAdmin
    .from('timer_sessions')
    .select('*')
    .lte('started_at', asOf.toISOString())
    .or(`stopped_at.is.null,stopped_at.gte.${yearStart.toISOString()}`)
    .order('started_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(calculateTimerStats(data || [], asOf))
}
