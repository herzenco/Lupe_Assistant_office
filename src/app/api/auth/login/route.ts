import { NextRequest, NextResponse } from 'next/server'
import { signJWT, checkPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (!password || !checkPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

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
