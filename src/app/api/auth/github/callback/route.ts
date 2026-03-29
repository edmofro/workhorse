import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForToken, getGitHubUser } from '../../../../../lib/auth/github'
import { setSessionUserId } from '../../../../../lib/auth/session'
import { prisma } from '../../../../../lib/prisma'

/**
 * GET /api/auth/github/callback
 * Handles the OAuth callback from GitHub. Exchanges the code for a token,
 * fetches the user profile, and creates or updates the local user record.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_state')?.value
  const returnTo = cookieStore.get('oauth_return_to')?.value ?? '/'

  // Clean up OAuth cookies
  cookieStore.delete('oauth_state')
  cookieStore.delete('oauth_return_to')

  // Validate state to prevent CSRF
  if (!code || !state || state !== savedState) {
    console.error('[OAuth] State mismatch', { hasCode: !!code, hasState: !!state, hasSavedState: !!savedState })
    return NextResponse.redirect(`${baseUrl}/sign-in?error=invalid_state`)
  }

  try {
    const accessToken = await exchangeCodeForToken(code)
    const githubUser = await getGitHubUser(accessToken)

    // Upsert the user record
    const user = await prisma.user.upsert({
      where: { githubId: githubUser.id },
      update: {
        githubUsername: githubUser.login,
        displayName: githubUser.name ?? githubUser.login,
        avatarUrl: githubUser.avatar_url,
        accessToken,
      },
      create: {
        githubId: githubUser.id,
        githubUsername: githubUser.login,
        displayName: githubUser.name ?? githubUser.login,
        avatarUrl: githubUser.avatar_url,
        accessToken,
      },
    })

    await setSessionUserId(user.id)

    return NextResponse.redirect(`${baseUrl}${returnTo}`)
  } catch (error) {
    console.error('[OAuth] Authentication failed:', error)
    return NextResponse.redirect(`${baseUrl}/sign-in?error=auth_failed`)
  }
}
