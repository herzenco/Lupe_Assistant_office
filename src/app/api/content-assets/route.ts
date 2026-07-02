import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  getContentAssetFileMetadata,
  normalizeContentAssetRegisterInput,
  resolveContentAssetPath,
} from '@/lib/contentAssets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('content_assets')
    .select('*, content_asset_exposures(*)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ assets: data || [] })
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  let input
  try {
    input = normalizeContentAssetRegisterInput(body || {})
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid asset registration' },
      { status: 400 }
    )
  }

  let resolved
  let metadata
  try {
    resolved = resolveContentAssetPath(input.path)
    metadata = await getContentAssetFileMetadata(resolved.absolutePath)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to read content asset' },
      { status: 400 }
    )
  }

  const row = {
    absolute_path: resolved.absolutePath,
    relative_path: resolved.relativePath,
    filename: metadata.filename,
    mime_type: metadata.mimeType,
    size_bytes: metadata.size,
    sha256: metadata.hash,
    tags: input.tags,
    metadata: input.metadata,
  }

  const { data, error } = await supabaseAdmin
    .from('content_assets')
    .upsert(row, { onConflict: 'absolute_path' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, asset: data }, { status: 201 })
}
