import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resolveContentAssetPath } from '@/lib/contentAssets'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PublicExposureRow = {
  id: string
  status: string
  expires_at: string
  cleaned_up_at: string | null
  content_assets: {
    absolute_path: string
    filename: string
    mime_type: string
    size_bytes: number
  } | null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || !/^[A-Za-z0-9_-]{32,}$/.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('content_asset_exposures')
    .select('id, status, expires_at, cleaned_up_at, content_assets(absolute_path, filename, mime_type, size_bytes)')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const exposure = data as PublicExposureRow | null
  if (!exposure || !exposure.content_assets) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const now = new Date()
  const isExpired = new Date(exposure.expires_at).getTime() <= now.getTime()
  if (exposure.cleaned_up_at || exposure.status !== 'active' || isExpired) {
    if (isExpired && exposure.status === 'active' && !exposure.cleaned_up_at) {
      await supabaseAdmin
        .from('content_asset_exposures')
        .update({ status: 'expired', cleaned_up_at: now.toISOString() })
        .eq('id', exposure.id)
    }
    return NextResponse.json({ error: 'Exposure expired' }, { status: 410 })
  }

  let absolutePath: string
  let size = exposure.content_assets.size_bytes
  try {
    absolutePath = resolveContentAssetPath(exposure.content_assets.absolute_path).absolutePath
    size = (await stat(absolutePath)).size
  } catch {
    return NextResponse.json({ error: 'Asset unavailable' }, { status: 404 })
  }

  const stream = Readable.toWeb(createReadStream(absolutePath)) as ReadableStream
  return new Response(stream, {
    headers: {
      'Content-Type': exposure.content_assets.mime_type,
      'Content-Length': String(size),
      'Content-Disposition': `inline; filename="${sanitizeFilename(exposure.content_assets.filename)}"`,
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/["\r\n]/g, '_')
}
