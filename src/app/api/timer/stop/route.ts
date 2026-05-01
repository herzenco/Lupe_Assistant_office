import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let project: string | undefined

  try {
    const body = await request.json()
    project = body.project
  } catch {
    // No body — will stop most recently started active timer
  }

  let query = supabaseAdmin
    .from('timer_sessions')
    .select('*')
    .is('stopped_at', null)
    .order('started_at', { ascending: false })
    .limit(1)

  if (project) {
    query = query.eq('project', project)
  }

  const { data: running } = await query.maybeSingle()

  if (!running) {
    return NextResponse.json({ running: false, message: 'No active timer' })
  }

  const duration = Math.round(
    (Date.now() - new Date(running.started_at).getTime()) / 1000
  )

  const { error } = await supabaseAdmin
    .from('timer_sessions')
    .update({ stopped_at: new Date().toISOString(), duration_seconds: duration })
    .eq('id', running.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    project: running.project,
    startedAt: running.started_at,
    stoppedAt: new Date().toISOString(),
    duration,
    running: false,
  })
}
