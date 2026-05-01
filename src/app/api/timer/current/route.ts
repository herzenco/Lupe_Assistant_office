import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data: running } = await supabaseAdmin
    .from('timer_sessions')
    .select('*')
    .is('stopped_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!running) {
    // Return last completed session
    const { data: last } = await supabaseAdmin
      .from('timer_sessions')
      .select('*')
      .not('stopped_at', 'is', null)
      .order('stopped_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      project: last?.project || null,
      startedAt: last?.started_at || null,
      stoppedAt: last?.stopped_at || null,
      duration: last?.duration_seconds || null,
      elapsed: last?.duration_seconds || 0,
      running: false,
    })
  }

  const elapsed = Math.round(
    (Date.now() - new Date(running.started_at).getTime()) / 1000
  )

  return NextResponse.json({
    project: running.project,
    startedAt: running.started_at,
    stoppedAt: null,
    duration: null,
    elapsed,
    running: true,
  })
}
