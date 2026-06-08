import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_COOKIE = 'admin_token'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Gate the admin dashboard pages (login page itself stays public)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get(ADMIN_COOKIE)?.value
    if (!process.env.ADMIN_SECRET_TOKEN || token !== process.env.ADMIN_SECRET_TOKEN) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  // Only run on admin pages. API routes guard themselves via requireAdmin().
  matcher: ['/admin/:path*'],
}
