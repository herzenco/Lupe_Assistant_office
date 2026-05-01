import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { project } = body

  if (!project || typeof project !== 'string') {
    return NextResponse.json({ error: 'project is required' }, { status: 400 })
  }

  // Stop any currently running timer
  const { data: running } = await supabaseAdmin
    .from('timer_sessions')
    .select('*')
    .is('stopped_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (running) {
    const duration = Math.round(
      (Date.now() - new Date(running.started_at).getTime()) / 1000
    )
    await supabaseAdmin
      .from('timer_sessions')
      .update({ stopped_at: new Date().toISOString(), duration_seconds: duration })
      .eq('id', running.id)
  }

  // Start new timer
  const { data, error } = await supabaseAdmin
    .from('timer_sessions')
    .insert({ project })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    project: data.project,
    startedAt: data.started_at,
    elapsed: 0,
    running: true,
  })
}
