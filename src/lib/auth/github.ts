/**
 * GitHub OAuth and permission utilities.
 *
 * Handles the OAuth flow (building authorize URL, exchanging code for token)
 * and querying the GitHub API for user profile and repo permissions.
 */

import { createHash } from 'crypto'

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

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/github/callback`

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
      redirect_uri: redirectUri,
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
 * Results are cached per token+repos combination for 5 minutes.
 */

const repoAccessCache = new Map<string, { result: Set<string>; expiresAt: number }>()
const REPO_ACCESS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const REPO_ACCESS_CACHE_MAX_SIZE = 100

function tokenHash(accessToken: string): string {
  return createHash('sha256').update(accessToken).digest('hex').slice(0, 16)
}

function evictExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of repoAccessCache) {
    if (entry.expiresAt <= now) repoAccessCache.delete(key)
  }
}

export async function filterAccessibleRepos(
  accessToken: string,
  repos: { owner: string; repoName: string }[],
): Promise<Set<string>> {
  // Include repos in cache key so adding a project invalidates the cache
  const repoFingerprint = repos.map((r) => `${r.owner}/${r.repoName}`).sort().join(',')
  const cacheKey = `${tokenHash(accessToken)}:${repoFingerprint}`
  const cached = repoAccessCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result
  }

  const results = await Promise.all(
    repos.map(async ({ owner, repoName }) => {
      const canWrite = await hasRepoWriteAccess(accessToken, owner, repoName)
      return canWrite ? `${owner}/${repoName}` : null
    }),
  )

  const result = new Set(results.filter((r): r is string => r !== null))

  // Evict expired entries and enforce size cap
  if (repoAccessCache.size >= REPO_ACCESS_CACHE_MAX_SIZE) {
    evictExpiredEntries()
  }
  if (repoAccessCache.size >= REPO_ACCESS_CACHE_MAX_SIZE) {
    // Still full — drop oldest entry
    const firstKey = repoAccessCache.keys().next().value
    if (firstKey) repoAccessCache.delete(firstKey)
  }

  repoAccessCache.set(cacheKey, { result, expiresAt: Date.now() + REPO_ACCESS_CACHE_TTL })
  return result
}

/**
 * Check whether a user has write access to a specific repo (cached).
 * Routes through filterAccessibleRepos to benefit from the in-memory cache.
 */
export async function requireProjectAccess(
  accessToken: string,
  owner: string,
  repoName: string,
): Promise<boolean> {
  const accessible = await filterAccessibleRepos(
    accessToken,
    [{ owner, repoName }],
  )
  return accessible.has(`${owner}/${repoName}`)
}
