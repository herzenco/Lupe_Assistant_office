import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search')
  const model = searchParams.get('model')
  const includeTranscript = searchParams.get('include') === 'transcript'
  const sessionId = searchParams.get('session_id')

  // Single session lookup with transcript
  if (sessionId) {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json(data)
  }

  const offset = (page - 1) * limit
  const columns = includeTranscript
    ? '*'
    : 'id, session_id, channel, model, summary, token_count, cost_usd, started_at, ended_at'

  let query = supabaseAdmin
    .from('sessions')
    .select(columns, { count: 'exact' })
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.ilike('summary', `%${search}%`)
  }
  if (model) {
    query = query.eq('model', model)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    sessions: data,
    total: count,
    page,
    limit,
    total_pages: Math.ceil((count || 0) / limit),
  })
}
