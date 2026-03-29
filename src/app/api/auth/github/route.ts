import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getGitHubAuthorizeUrl } from '../../../../lib/auth/github'

/**
 * GET /api/auth/github
 * Initiates the GitHub OAuth flow by redirecting to GitHub's authorize page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const returnTo = url.searchParams.get('returnTo') ?? '/'

  // Generate a random state parameter to prevent CSRF
  const state = crypto.randomUUID()

  const isProduction = process.env.NODE_ENV === 'production'

  const cookieStore = await cookies()
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })
  cookieStore.set('oauth_return_to', returnTo, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return NextResponse.redirect(getGitHubAuthorizeUrl(state))
}
