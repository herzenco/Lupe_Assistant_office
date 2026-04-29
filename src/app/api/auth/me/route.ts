import { NextResponse } from 'next/server'

export async function GET() {
  // If we reach here, middleware already verified the JWT
  return NextResponse.json({ authenticated: true, user: 'herzen' })
}
