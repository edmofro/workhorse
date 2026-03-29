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
