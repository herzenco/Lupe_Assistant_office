import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cleanedUpAt = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('content_asset_exposures')
    .update({ status: 'revoked', cleaned_up_at: cleanedUpAt })
    .eq('asset_id', id)
    .eq('status', 'active')
    .is('cleaned_up_at', null)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, revoked: data?.length || 0, exposures: data || [] })
}
