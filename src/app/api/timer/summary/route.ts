import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // Get all sessions started today (both completed and running)
  const { data, error } = await supabaseAdmin
    .from('timer_sessions')
    .select('*')
    .gte('started_at', todayStart.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const byProject: Record<string, number> = {}

  for (const s of data || []) {
    const duration = s.stopped_at
      ? s.duration_seconds || 0
      : Math.round((Date.now() - new Date(s.started_at).getTime()) / 1000)
    byProject[s.project] = (byProject[s.project] || 0) + duration
  }

  return NextResponse.json(
    Object.entries(byProject).map(([project, totalToday]) => ({
      project,
      totalToday,
    }))
  )
}
