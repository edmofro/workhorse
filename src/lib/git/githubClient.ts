/**
 * GitHub API client for branch/commit/PR operations
 * Uses the authenticated user's OAuth token for all requests
 */

const GITHUB_API = 'https://api.github.com'

function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }
}

export async function getRef(token: string, owner: string, repo: string, ref: string) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${ref}`,
    { headers: getHeaders(token) },
  )
  if (!res.ok) return null
  return res.json()
}

export async function createBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  fromSha: string,
) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: fromSha,
      }),
    },
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create branch: ${err}`)
  }
  return res.json()
}

export async function createOrUpdateFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  existingSha?: string,
) {
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
  }
  if (existingSha) body.sha = existingSha

  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create/update file: ${err}`)
  }
  return res.json()
}

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
) {
  const url = new URL(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`)
  if (ref) url.searchParams.set('ref', ref)

  const res = await fetch(url.toString(), { headers: getHeaders(token) })
  if (!res.ok) return null

  const data = await res.json()
  if (data.content) {
    return {
      ...data,
      decodedContent: Buffer.from(data.content, 'base64').toString('utf-8'),
    }
  }
  return data
}

export async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string,
) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ title, body, head, base }),
    },
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to create PR: ${err}`)
  }
  return res.json()
}

/**
 * Get the combined check status for a ref (branch or SHA).
 * Returns a simplified summary: 'passing', 'failing', 'pending', or null.
 */
export async function getCheckStatus(
  token: string,
  owner: string,
  repo: string,
  ref: string,
): Promise<{ status: 'passing' | 'failing' | 'pending' | null; total: number }> {
  const encodedRef = encodeURIComponent(ref)

  // Combined status (legacy statuses) + check suites (GitHub Actions) in parallel
  const [statusRes, suitesRes] = await Promise.all([
    fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits/${encodedRef}/status`, {
      headers: getHeaders(token),
    }),
    fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits/${encodedRef}/check-suites?per_page=100`, {
      headers: getHeaders(token),
    }),
  ])

  let commitStatus: string | null = null
  let suiteConclusion: string | null = null
  let total = 0

  if (statusRes.ok) {
    const data = await statusRes.json()
    commitStatus = data.state // 'success', 'failure', 'pending', 'error'
    total += data.total_count ?? 0
  }

  if (suitesRes.ok) {
    const data = await suitesRes.json()
    const suites: { status: string; conclusion: string | null }[] = data.check_suites ?? []
    total += suites.length

    // Aggregate across all check suites
    const hasFailure = suites.some((s) => s.conclusion === 'failure' || s.conclusion === 'timed_out')
    const hasPending = suites.some((s) => s.status === 'in_progress' || s.status === 'queued')
    const hasSuccess = suites.some((s) => s.conclusion === 'success')

    if (hasFailure) suiteConclusion = 'failure'
    else if (hasPending) suiteConclusion = 'pending'
    else if (hasSuccess) suiteConclusion = 'success'
  }

  if (total === 0) return { status: null, total: 0 }

  // Combine: any failure → failing, any pending → pending, else passing
  if (commitStatus === 'failure' || commitStatus === 'error' || suiteConclusion === 'failure') {
    return { status: 'failing', total }
  }
  if (commitStatus === 'pending' || suiteConclusion === 'pending') {
    return { status: 'pending', total }
  }
  if (commitStatus === 'success' || suiteConclusion === 'success') {
    return { status: 'passing', total }
  }

  return { status: 'pending', total }
}

/**
 * Get a pull request by number.
 * Returns key fields: state, merged, title, merged_at.
 */
export async function getPullRequest(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<{
  state: string
  merged: boolean
  title: string
  mergedAt: string | null
} | null> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`,
    { headers: getHeaders(token) },
  )
  if (!res.ok) return null
  const data = await res.json()
  return {
    state: data.state,
    merged: data.merged ?? false,
    title: data.title,
    mergedAt: data.merged_at ?? null,
  }
}

export async function getTree(
  token: string,
  owner: string,
  repo: string,
  treeSha: string,
  recursive = true,
) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${treeSha}${recursive ? '?recursive=1' : ''}`
  const res = await fetch(url, { headers: getHeaders(token) })
  if (!res.ok) return null
  return res.json()
}
