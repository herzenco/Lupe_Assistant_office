import { NextRequest, NextResponse } from 'next/server'
import { signJWT, checkPin } from '@/lib/auth'
import { hasSupabaseConfig, supabaseAdmin } from '@/lib/supabase'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

interface LoginAttempt {
  count: number
  reset_at: string
}

export async function POST(request: NextRequest) {
  const { pin, password } = await request.json()
  const submittedPin = typeof pin === 'string' ? pin : password
  const clientKey = getClientKey(request)
  const retryAfter = await getRetryAfterSeconds(clientKey)

  if (retryAfter > 0) {
    return NextResponse.json(
      { error: 'Too many login attempts' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  if (!submittedPin || !checkPin(submittedPin)) {
    await recordFailedAttempt(clientKey)
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  await clearFailedAttempts(clientKey)
  const token = await signJWT({ user: 'herzen', role: 'admin' })

  const response = NextResponse.json({ ok: true })
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return response
}

function getClientKey(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown'
}

async function getRetryAfterSeconds(key: string): Promise<number> {
  if (!hasSupabaseConfig()) return 0

  const now = Date.now()
  const { data, error } = await supabaseAdmin
    .from('login_attempts')
    .select('count, reset_at')
    .eq('client_key', key)
    .maybeSingle<LoginAttempt>()

  if (error) {
    console.error('Failed to read login attempts:', error.message)
    return 0
  }

  if (!data) return 0

  const resetAt = new Date(data.reset_at).getTime()
  if (resetAt <= now) {
    await clearFailedAttempts(key)
    return 0
  }

  if (data.count < MAX_ATTEMPTS) {
    return 0
  }

  return Math.ceil((resetAt - now) / 1000)
}

async function recordFailedAttempt(key: string) {
  if (!hasSupabaseConfig()) return

  const now = Date.now()
  const resetAt = new Date(now + WINDOW_MS).toISOString()
  const { data: existing, error: readError } = await supabaseAdmin
    .from('login_attempts')
    .select('count, reset_at')
    .eq('client_key', key)
    .maybeSingle<LoginAttempt>()

  if (readError) {
    console.error('Failed to read login attempts:', readError.message)
    return
  }

  const existingResetAt = existing ? new Date(existing.reset_at).getTime() : 0
  const count = !existing || existingResetAt <= now ? 1 : existing.count + 1
  const nextResetAt = !existing || existingResetAt <= now ? resetAt : existing.reset_at

  const { error } = await supabaseAdmin
    .from('login_attempts')
    .upsert({
      client_key: key,
      count,
      reset_at: nextResetAt,
      updated_at: new Date(now).toISOString(),
    })

  if (error) {
    console.error('Failed to record login attempt:', error.message)
  }
}

async function clearFailedAttempts(key: string) {
  if (!hasSupabaseConfig()) return

  const { error } = await supabaseAdmin
    .from('login_attempts')
    .delete()
    .eq('client_key', key)

  if (error) {
    console.error('Failed to clear login attempts:', error.message)
  }
}
