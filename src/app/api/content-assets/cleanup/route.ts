import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const cleanedUpAt = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('content_asset_exposures')
    .update({ status: 'expired', cleaned_up_at: cleanedUpAt })
    .eq('status', 'active')
    .is('cleaned_up_at', null)
    .lte('expires_at', cleanedUpAt)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cleaned_up: data?.length || 0, exposures: data || [] })
}
