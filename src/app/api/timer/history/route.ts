import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data, error } = await supabaseAdmin
    .from('timer_sessions')
    .select('*')
    .gte('started_at', todayStart.toISOString())
    .not('stopped_at', 'is', null)
    .order('started_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    (data || []).map(s => ({
      project: s.project,
      startedAt: s.started_at,
      stoppedAt: s.stopped_at,
      duration: s.duration_seconds,
    }))
  )
}
