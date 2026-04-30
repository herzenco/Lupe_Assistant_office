import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Google Calendar integration — placeholder until OAuth/API key configured
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const from = searchParams.get('from') || new Date().toISOString()
  const to = searchParams.get('to') || new Date(Date.now() + 7 * 86400000).toISOString()

  // Fetch task due dates as calendar events
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select('id, title, project_tag, due_date, priority, status')
    .not('due_date', 'is', null)
    .gte('due_date', from.split('T')[0])
    .lte('due_date', to.split('T')[0])

  const taskEvents = (tasks || []).map(t => ({
    id: `task-${t.id}`,
    title: t.title,
    start: t.due_date,
    end: t.due_date,
    type: 'task' as const,
    project_tag: t.project_tag,
    priority: t.priority,
    status: t.status,
  }))

  // TODO: Add Google Calendar API integration
  // const googleEvents = await fetchGoogleCalendarEvents(from, to)

  return NextResponse.json({
    events: [...taskEvents],
    // When Google Calendar is integrated, merge: [...taskEvents, ...googleEvents]
  })
}
