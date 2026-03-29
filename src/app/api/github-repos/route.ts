import { NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'

const GITHUB_API = 'https://api.github.com'

interface GitHubRepo {
  full_name: string
  name: string
  owner: { login: string }
  html_url: string
  default_branch: string
  permissions?: { push?: boolean; admin?: boolean }
}

export async function GET() {
  const user = await requireUser()

  const repos: GitHubRepo[] = []
  let page = 1

  // Paginate through all repos the user can access
  while (true) {
    const res = await fetch(
      `${GITHUB_API}/user/repos?per_page=100&page=${page}&sort=full_name&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      },
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch repositories from GitHub' },
        { status: 502 },
      )
    }

    const batch: GitHubRepo[] = await res.json()
    if (batch.length === 0) break

    // Only include repos the user has write access to
    for (const repo of batch) {
      if (repo.permissions?.push || repo.permissions?.admin) {
        repos.push(repo)
      }
    }

    if (batch.length < 100) break
    page++
  }

  return NextResponse.json(
    repos.map((r) => ({
      fullName: r.full_name,
      name: r.name,
      owner: r.owner.login,
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch,
    })),
  )
}
