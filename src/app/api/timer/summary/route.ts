import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { summarizeToday } from '@/lib/timerStats'

export const dynamic = 'force-dynamic'

export async function GET() {
  const asOf = new Date()
  const todayStart = new Date(asOf)
  todayStart.setHours(0, 0, 0, 0)

  // Get sessions that overlap today, including sessions started yesterday.
  const { data, error } = await supabaseAdmin
    .from('timer_sessions')
    .select('*')
    .lte('started_at', asOf.toISOString())
    .or(`stopped_at.is.null,stopped_at.gte.${todayStart.toISOString()}`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(summarizeToday(data || [], asOf))
}
