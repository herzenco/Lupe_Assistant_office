import { NextRequest, NextResponse } from 'next/server'
import { signJWT, checkPassword } from '@/lib/auth'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
const attempts = new Map<string, { count: number; resetAt: number }>()

export async function POST(request: NextRequest) {
  const { password } = await request.json()
  const clientKey = getClientKey(request)
  const retryAfter = getRetryAfterSeconds(clientKey)

  if (retryAfter > 0) {
    return NextResponse.json(
      { error: 'Too many login attempts' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  if (!password || !checkPassword(password)) {
    recordFailedAttempt(clientKey)
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  attempts.delete(clientKey)
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

function getRetryAfterSeconds(key: string): number {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || entry.resetAt <= now) {
    attempts.delete(key)
    return 0
  }

  if (entry.count < MAX_ATTEMPTS) {
    return 0
  }

  return Math.ceil((entry.resetAt - now) / 1000)
}

function recordFailedAttempt(key: string) {
  const now = Date.now()
  const entry = attempts.get(key)

  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return
  }

  attempts.set(key, { ...entry, count: entry.count + 1 })
}
