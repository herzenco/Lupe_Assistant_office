import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const INTEGRATION_KEYS = [
  'clickup',
  'github',
  'google_calendar',
  'google_drive',
  'telegram',
]

type IntegrationStatus = {
  status: string
  last_checked?: string
}

function normalizeIntegrations(health: Record<string, unknown> | null): Record<string, IntegrationStatus> {
  const raw = health?.integrations
  const integrations: Record<string, IntegrationStatus> =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...(raw as Record<string, IntegrationStatus>) }
      : {}

  for (const key of INTEGRATION_KEYS) {
    if (!integrations[key]) {
      integrations[key] = { status: 'unknown' }
    }
  }

  return integrations
}

export async function GET() {
  const [healthRes, heartbeatRes] = await Promise.all([
    supabaseAdmin
      .from('system_health')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('heartbeats')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (healthRes.error || heartbeatRes.error) {
    return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 })
  }

  const lastHeartbeat = heartbeatRes.data
  const health = healthRes.data
    ? {
        ...healthRes.data,
        integrations: normalizeIntegrations(healthRes.data),
      }
    : null

  // Calculate uptime from last session_start heartbeat
  let uptime_seconds: number | null = null
  if (lastHeartbeat) {
    const { data: sessionStart } = await supabaseAdmin
      .from('heartbeats')
      .select('timestamp')
      .eq('action_type', 'session_start')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionStart) {
      uptime_seconds = Math.floor((Date.now() - new Date(sessionStart.timestamp).getTime()) / 1000)
    }
  }

  return NextResponse.json({
    health,
    last_heartbeat: lastHeartbeat,
    uptime_seconds,
    heartbeat_stale: lastHeartbeat
      ? (Date.now() - new Date(lastHeartbeat.timestamp).getTime()) > 120_000
      : true,
  })
}
