import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const project = searchParams.get('project_tag')
  const priority = searchParams.get('priority')

  let query = supabaseAdmin
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (project) query = query.eq('project_tag', project)
  if (priority) query = query.eq('priority', priority)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, description, priority, project_tag, due_date, complexity, status } = body

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      title,
      description: description || '',
      priority: priority || 'normal',
      project_tag: project_tag || null,
      due_date: due_date || null,
      complexity: complexity || 'medium',
      status: status || 'inbox',
      notes: [],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
