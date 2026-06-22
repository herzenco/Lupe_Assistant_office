import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isWorkReportSource, normalizeWorkReportInput } from '@/lib/workReports'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const source = searchParams.get('source')
  const days = Math.min(31, Math.max(1, parseInt(searchParams.get('days') || '1', 10)))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

  const since = new Date()
  since.setDate(since.getDate() - days)

  let query = supabaseAdmin
    .from('work_reports')
    .select('*')
    .gte('occurred_at', since.toISOString())
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (source) {
    if (!isWorkReportSource(source)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }
    query = query.eq('source', source)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ reports: data || [] })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const items = Array.isArray(body) ? body : [body]

  let rows
  try {
    rows = items.map(item => {
      const report = normalizeWorkReportInput(item)
      return {
        source: report.source,
        title: report.title,
        summary: report.summary,
        details: report.details,
        occurred_at: report.occurred_at || new Date().toISOString(),
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid report' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('work_reports')
    .insert(rows)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, reports: data || [] }, { status: 201 })
}
