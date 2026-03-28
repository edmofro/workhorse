import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Proxy that protects all routes except sign-in and auth API routes.
 * Unauthenticated visitors are redirected to /sign-in with a returnTo parameter.
 */
export function proxy(request: NextRequest) {
  const sessionUserId = request.cookies.get('sessionUserId')?.value

  if (!sessionUserId) {
    const returnTo = request.nextUrl.pathname + request.nextUrl.search
    const signInUrl = new URL('/sign-in', request.url)
    if (returnTo !== '/') {
      signInUrl.searchParams.set('returnTo', returnTo)
    }
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /sign-in (the login page itself)
     * - /api/auth (OAuth flow routes)
     * - /_next (Next.js internals)
     * - /favicon.ico, /icon.*, /apple-icon.* (static assets)
     */
    '/((?!sign-in|api/auth|_next|favicon\\.ico|icon\\.|apple-icon\\.).*)',
  ],
}
