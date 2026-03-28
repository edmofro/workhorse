/**
 * GitHub OAuth and permission utilities.
 *
 * Handles the OAuth flow (building authorize URL, exchanging code for token)
 * and querying the GitHub API for user profile and repo permissions.
 */

const GITHUB_API = 'https://api.github.com'

export function getGitHubAuthorizeUrl(state: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) throw new Error('GITHUB_CLIENT_ID not set')

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/github/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user repo',
    state,
  })

  return `https://github.com/login/oauth/authorize?${params}`
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) throw new Error('GITHUB_CLIENT_ID not set')
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!clientSecret) throw new Error('GITHUB_CLIENT_SECRET not set')

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  })

  if (!res.ok) {
    throw new Error('Failed to exchange code for token')
  }

  const data = await res.json()
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description ?? data.error}`)
  }

  return data.access_token
}

export interface GitHubUser {
  id: number
  login: string
  name: string | null
  avatar_url: string
}

export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!res.ok) {
    throw new Error('Failed to fetch GitHub user')
  }

  return res.json()
}

/**
 * Check whether a user has write (push) access to a specific repo.
 */
export async function hasRepoWriteAccess(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<boolean> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!res.ok) return false

  const data = await res.json()
  return data.permissions?.push === true || data.permissions?.admin === true
}

/**
 * Given a list of owner/repo pairs, return the ones the user has write access to.
 */
export async function filterAccessibleRepos(
  accessToken: string,
  repos: { owner: string; repoName: string }[],
): Promise<Set<string>> {
  const results = await Promise.all(
    repos.map(async ({ owner, repoName }) => {
      const canWrite = await hasRepoWriteAccess(accessToken, owner, repoName)
      return canWrite ? `${owner}/${repoName}` : null
    }),
  )

  return new Set(results.filter((r): r is string => r !== null))
}
