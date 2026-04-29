import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { action_type, summary, project_tag, session_id, timestamp } = await request.json()

  if (!action_type || !summary) {
    return NextResponse.json({ error: 'action_type and summary are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('actions')
    .insert({
      action_type,
      summary,
      project_tag: project_tag || null,
      session_id: session_id || null,
      timestamp: timestamp || new Date().toISOString(),
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const action_type = searchParams.get('action_type')
  const project_tag = searchParams.get('project_tag')
  const search = searchParams.get('search')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('actions')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1)

  if (action_type) query = query.eq('action_type', action_type)
  if (project_tag) query = query.eq('project_tag', project_tag)
  if (search) query = query.ilike('summary', `%${search}%`)
  if (from) query = query.gte('timestamp', from)
  if (to) query = query.lte('timestamp', to)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by day for UI
  const grouped: Record<string, typeof data> = {}
  data?.forEach(action => {
    const day = action.timestamp.split('T')[0]
    if (!grouped[day]) grouped[day] = []
    grouped[day].push(action)
  })

  return NextResponse.json({
    actions: data,
    grouped,
    total: count,
    page,
    limit,
    total_pages: Math.ceil((count || 0) / limit),
  })
}
