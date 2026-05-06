import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { project } = body

  if (!project || typeof project !== 'string') {
    return NextResponse.json({ error: 'project is required' }, { status: 400 })
  }

  // Check if this project already has a running timer
  const { data: existing } = await supabaseAdmin
    .from('timer_sessions')
    .select('*')
    .eq('project', project)
    .is('stopped_at', null)
    .limit(1)
    .maybeSingle()

  if (existing) {
    // No-op — return current state
    const elapsed = Math.round(
      (Date.now() - new Date(existing.started_at).getTime()) / 1000
    )
    return NextResponse.json({
      project: existing.project,
      startedAt: existing.started_at,
      elapsed,
      running: true,
    })
  }

  // Start new timer for this project
  const { data, error } = await supabaseAdmin
    .from('timer_sessions')
    .insert({ project })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: active, error: activeError } = await supabaseAdmin
        .from('timer_sessions')
        .select('*')
        .eq('project', project)
        .is('stopped_at', null)
        .limit(1)
        .maybeSingle()

      if (!activeError && active) {
        return NextResponse.json({
          project: active.project,
          startedAt: active.started_at,
          elapsed: Math.round((Date.now() - new Date(active.started_at).getTime()) / 1000),
          running: true,
        })
      }
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    project: data.project,
    startedAt: data.started_at,
    elapsed: 0,
    running: true,
  })
}
