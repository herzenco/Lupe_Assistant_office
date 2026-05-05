import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json()
  const { file_count } = body

  if (file_count === undefined) {
    return NextResponse.json({ error: 'file_count is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({
      file_count,
      file_count_updated_at: new Date().toISOString(),
    })
    .eq('slug', slug)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
