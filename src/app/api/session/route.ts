import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { session_id, channel, model, summary, transcript, token_count, cost_usd, started_at, ended_at } = body

  if (!session_id || !started_at) {
    return NextResponse.json({ error: 'session_id and started_at are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('sessions')
    .upsert({
      session_id,
      channel,
      model,
      summary,
      transcript: transcript || [],
      token_count: token_count || 0,
      cost_usd: cost_usd || 0,
      started_at,
      ended_at,
    }, { onConflict: 'session_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
