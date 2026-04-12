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
 *
 * Uses stale-while-revalidate caching: serves cached results immediately (up to
 * 48h) while triggering a background refresh. This means the first request after
 * a revalidation window returns instantly from cache, and the fresh result is
 * available for the next request.
 */

interface CacheEntry {
  result: Set<string>
  /** Hard expiry — entry is evicted after this time */
  expiresAt: number
  /** Soft expiry — entry is still served but triggers a background refresh */
  staleAt: number
}

const repoAccessCache = new Map<string, CacheEntry>()
const REPO_ACCESS_STALE_TIME = 5 * 60 * 1000        // Fresh for 5 min, then serve stale + revalidate
const REPO_ACCESS_MAX_AGE = 48 * 60 * 60 * 1000     // Hard expiry after 48 hours
const REPO_ACCESS_CACHE_MAX_SIZE = 100
let lastEvictionTime = 0
const EVICTION_INTERVAL = 60 * 1000
// Track in-flight background revalidations to avoid duplicate fetches
const pendingRevalidations = new Set<string>()

function tokenHash(accessToken: string): string {
  return createHash('sha256').update(accessToken).digest('hex')
}

function evictExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of repoAccessCache) {
    if (entry.expiresAt <= now) repoAccessCache.delete(key)
  }
}

function buildCacheKey(accessToken: string, repos: { owner: string; repoName: string }[]): string {
  const repoFingerprint = repos.map((r) => `${r.owner}/${r.repoName}`).sort().join(',')
  return `${tokenHash(accessToken)}:${repoFingerprint}`
}

async function fetchAndCacheAccess(
  accessToken: string,
  repos: { owner: string; repoName: string }[],
  cacheKey: string,
): Promise<Set<string>> {
  const results = await Promise.all(
    repos.map(async ({ owner, repoName }) => {
      const canWrite = await hasRepoWriteAccess(accessToken, owner, repoName)
      return canWrite ? `${owner}/${repoName}` : null
    }),
  )

  const result = new Set(results.filter((r): r is string => r !== null))
  const now = Date.now()

  // Evict periodically and enforce size cap
  if (repoAccessCache.size >= REPO_ACCESS_CACHE_MAX_SIZE || now - lastEvictionTime > EVICTION_INTERVAL) {
    evictExpiredEntries()
    lastEvictionTime = now
  }
  if (repoAccessCache.size >= REPO_ACCESS_CACHE_MAX_SIZE) {
    const firstKey = repoAccessCache.keys().next().value
    if (firstKey) repoAccessCache.delete(firstKey)
  }

  repoAccessCache.set(cacheKey, {
    result,
    staleAt: now + REPO_ACCESS_STALE_TIME,
    expiresAt: now + REPO_ACCESS_MAX_AGE,
  })
  return result
}

export async function filterAccessibleRepos(
  accessToken: string,
  repos: { owner: string; repoName: string }[],
): Promise<Set<string>> {
  if (repos.length === 0) return new Set()

  const cacheKey = buildCacheKey(accessToken, repos)
  const cached = repoAccessCache.get(cacheKey)
  const now = Date.now()

  if (cached && cached.expiresAt > now) {
    // Cache hit — if stale, trigger background revalidation (fire-and-forget)
    if (cached.staleAt <= now && !pendingRevalidations.has(cacheKey)) {
      pendingRevalidations.add(cacheKey)
      fetchAndCacheAccess(accessToken, repos, cacheKey)
        .catch(() => {
          // Revalidation failed — shorten the stale entry's hard expiry so
          // we don't serve potentially-revoked permissions for 48h
          const entry = repoAccessCache.get(cacheKey)
          if (entry) {
            entry.expiresAt = Math.min(entry.expiresAt, Date.now() + 10 * 60 * 1000)
          }
        })
        .finally(() => pendingRevalidations.delete(cacheKey))
    }
    return cached.result
  }

  // Cache miss or expired — fetch synchronously
  return fetchAndCacheAccess(accessToken, repos, cacheKey)
}

/**
 * Check whether a user has write access to a specific repo.
 * Routes through filterAccessibleRepos to benefit from the in-memory cache.
 * Returns true/false — callers must check the result and return 403 if false.
 */
export async function hasProjectAccess(
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
