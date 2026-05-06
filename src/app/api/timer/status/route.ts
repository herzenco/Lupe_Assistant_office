import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('timer_sessions')
    .select('*')
    .is('stopped_at', null)
    .order('started_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(
    (data || []).map(s => ({
      id: s.id,
      project: s.project,
      startedAt: s.started_at,
      elapsed: Math.round((Date.now() - new Date(s.started_at).getTime()) / 1000),
      running: true,
    }))
  )
}
