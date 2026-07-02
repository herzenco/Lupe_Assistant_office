import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  buildContentAssetPublicUrl,
  getConfiguredContentAssetPublicBaseUrl,
  getContentAssetExpiry,
  getContentAssetFileMetadata,
  getContentAssetToken,
  resolveContentAssetPath,
} from '@/lib/contentAssets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await readJson(request)

  const { data: asset, error: assetError } = await supabaseAdmin
    .from('content_assets')
    .select('*')
    .eq('id', id)
    .single()

  if (assetError || !asset) {
    return NextResponse.json({ error: assetError?.message || 'Asset not found' }, { status: 404 })
  }

  let expiresAt: Date
  let refreshed
  try {
    const resolved = resolveContentAssetPath(asset.absolute_path)
    refreshed = await getContentAssetFileMetadata(resolved.absolutePath)
    expiresAt = getContentAssetExpiry({
      expiresAt: typeof body.expires_at === 'string' ? body.expires_at : null,
      ttlSeconds: typeof body.ttl_seconds === 'number' ? body.ttl_seconds : null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to expose asset' },
      { status: 400 }
    )
  }

  const token = getContentAssetToken()
  const publicUrl = buildContentAssetPublicUrl(
    getConfiguredContentAssetPublicBaseUrl(request.url),
    token
  )
  const now = new Date().toISOString()

  await supabaseAdmin
    .from('content_asset_exposures')
    .update({ status: 'expired', cleaned_up_at: now })
    .eq('asset_id', id)
    .eq('status', 'active')
    .is('cleaned_up_at', null)
    .lte('expires_at', now)

  const { error: updateError } = await supabaseAdmin
    .from('content_assets')
    .update({
      filename: refreshed.filename,
      mime_type: refreshed.mimeType,
      size_bytes: refreshed.size,
      sha256: refreshed.hash,
    })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { data: exposure, error } = await supabaseAdmin
    .from('content_asset_exposures')
    .insert({
      asset_id: id,
      token,
      public_url: publicUrl,
      expires_at: expiresAt.toISOString(),
      note: typeof body.note === 'string' ? body.note : null,
      content_task_id: typeof body.content_task_id === 'string' ? body.content_task_id : null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, exposure }, { status: 201 })
}

async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}
