import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_PATHS = ['/login', '/api/auth/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // API routes: accept Bearer token OR JWT cookie
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      if (token === process.env.DASHBOARD_API_KEY) {
        return NextResponse.next()
      }
    }

    // Fall through to JWT check
    const jwt = request.cookies.get('session')?.value
    if (jwt && await verifyToken(jwt)) {
      return NextResponse.next()
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Dashboard pages: open access (no login required)
  return NextResponse.next()
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    await jwtVerify(token, secret)
    return true
  } catch {
    return false
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
