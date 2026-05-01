import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST() {
  const { data: running } = await supabaseAdmin
    .from('timer_sessions')
    .select('*')
    .is('stopped_at', null)

  if (!running || running.length === 0) {
    return NextResponse.json({ stopped: 0, message: 'No active timers' })
  }

  const now = new Date().toISOString()

  for (const session of running) {
    const duration = Math.round(
      (Date.now() - new Date(session.started_at).getTime()) / 1000
    )
    await supabaseAdmin
      .from('timer_sessions')
      .update({ stopped_at: now, duration_seconds: duration })
      .eq('id', session.id)
  }

  return NextResponse.json({
    stopped: running.length,
    projects: running.map(s => s.project),
  })
}
