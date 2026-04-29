import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  // If adding a note, append to existing notes array
  if (body.add_note) {
    const { data: existing } = await supabaseAdmin
      .from('tasks')
      .select('notes')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const notes = [...(existing.notes || []), {
      text: body.add_note,
      timestamp: new Date().toISOString(),
      author: body.author || 'lupe',
    }]

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update({ notes })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // General update
  const allowed = ['title', 'description', 'priority', 'project_tag', 'due_date', 'complexity', 'status', 'notes']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabaseAdmin
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
