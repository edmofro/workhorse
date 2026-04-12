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
  // Use the combined status + check runs endpoints in parallel
  const [statusRes, checksRes] = await Promise.all([
    fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits/${ref}/status`, {
      headers: getHeaders(token),
    }),
    fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits/${ref}/check-runs?per_page=1`, {
      headers: getHeaders(token),
    }),
  ])

  let commitStatus: string | null = null
  let checkConclusion: string | null = null
  let total = 0

  if (statusRes.ok) {
    const data = await statusRes.json()
    commitStatus = data.state // 'success', 'failure', 'pending', 'error'
    total += data.total_count ?? 0
  }

  if (checksRes.ok) {
    const data = await checksRes.json()
    total += data.total_count ?? 0
    if (data.check_runs?.length > 0) {
      // Check if any are in progress or have failed
      const run = data.check_runs[0]
      if (run.status === 'in_progress' || run.status === 'queued') {
        checkConclusion = 'pending'
      } else if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
        checkConclusion = 'failure'
      } else if (run.conclusion === 'success') {
        checkConclusion = 'success'
      }
    }
  }

  if (total === 0) return { status: null, total: 0 }

  // Combine: any failure → failing, any pending → pending, else passing
  if (commitStatus === 'failure' || commitStatus === 'error' || checkConclusion === 'failure') {
    return { status: 'failing', total }
  }
  if (commitStatus === 'pending' || checkConclusion === 'pending') {
    return { status: 'pending', total }
  }
  if (commitStatus === 'success' || checkConclusion === 'success') {
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
