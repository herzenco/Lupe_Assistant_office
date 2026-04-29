import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    status, session_type, model, task, action_type, detail,
    tokens_in, tokens_out, cost_usd,
    cpu_pct, ram_pct, disk_pct, gateway_status, drive_status, integrations,
  } = body

  // Insert heartbeat
  const { error: hbErr } = await supabaseAdmin
    .from('heartbeats')
    .insert({
      status: status || 'active',
      session_type,
      model,
      task,
      action_type,
      detail,
      tokens_in: tokens_in || 0,
      tokens_out: tokens_out || 0,
      cost_usd: cost_usd || 0,
    })

  if (hbErr) {
    return NextResponse.json({ error: hbErr.message }, { status: 500 })
  }

  // Upsert system health if machine metrics present
  if (cpu_pct !== undefined || ram_pct !== undefined || disk_pct !== undefined) {
    await supabaseAdmin
      .from('system_health')
      .insert({
        cpu_pct,
        ram_pct,
        disk_pct,
        gateway_status: gateway_status || 'unknown',
        drive_status: drive_status || 'unknown',
        integrations: integrations || {},
      })
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('heartbeats')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
