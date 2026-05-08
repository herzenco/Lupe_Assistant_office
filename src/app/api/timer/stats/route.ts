import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const asOf = new Date()
  const now = asOf

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const yearStart = new Date(now.getFullYear(), 0, 1)

  // Fetch all sessions this year (covers all time ranges)
  const { data, error } = await supabaseAdmin
    .from('timer_sessions')
    .select('*')
    .gte('started_at', yearStart.toISOString())
    .order('started_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const sessions = data || []

  // Calculate duration for each session (including still-running ones)
  const withDuration = sessions.map(s => ({
    ...s,
    computed_duration: s.stopped_at
      ? (s.duration_seconds || Math.round((new Date(s.stopped_at).getTime() - new Date(s.started_at).getTime()) / 1000))
      : Math.round((Date.now() - new Date(s.started_at).getTime()) / 1000),
  }))

  // Group by project and time range
  const projectStats: Record<string, { today: number; week: number; month: number; year: number }> = {}

  for (const s of withDuration) {
    const started = new Date(s.started_at)
    if (!projectStats[s.project]) {
      projectStats[s.project] = { today: 0, week: 0, month: 0, year: 0 }
    }
    const ps = projectStats[s.project]
    ps.year += s.computed_duration
    if (started >= monthStart) ps.month += s.computed_duration
    if (started >= weekStart) ps.week += s.computed_duration
    if (started >= todayStart) ps.today += s.computed_duration
  }

  // Totals
  const totals = { today: 0, week: 0, month: 0, year: 0 }
  for (const ps of Object.values(projectStats)) {
    totals.today += ps.today
    totals.week += ps.week
    totals.month += ps.month
    totals.year += ps.year
  }

  return NextResponse.json({
    asOf: asOf.toISOString(),
    projects: Object.entries(projectStats).map(([project, times]) => ({
      project,
      ...times,
    })),
    totals,
  })
}
