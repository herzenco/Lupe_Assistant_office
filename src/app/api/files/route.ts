import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const project = searchParams.get('project')

  let query = supabaseAdmin
    .from('project_files')
    .select('*')
    .order('created_at', { ascending: false })

  if (project) {
    query = query.eq('project', project)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also return counts by project
  const byProject: Record<string, number> = {}
  for (const f of data || []) {
    byProject[f.project] = (byProject[f.project] || 0) + 1
  }

  return NextResponse.json({ files: data, counts: byProject })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Accept single file or batch
  const files = Array.isArray(body) ? body : [body]

  for (const f of files) {
    if (!f.project || !f.filename) {
      return NextResponse.json({ error: 'project and filename are required' }, { status: 400 })
    }
  }

  const rows = files.map(f => ({
    project: f.project,
    filename: f.filename,
    file_type: f.file_type || null,
    path: f.path || null,
  }))

  const { data, error } = await supabaseAdmin
    .from('project_files')
    .upsert(rows, { onConflict: 'id' })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, count: data?.length || 0 })
}
