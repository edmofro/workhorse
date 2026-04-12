import { NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { getProjects } from '../../../lib/actions/projects'
import { filterAccessibleRepos } from '../../../lib/auth/github'
import { getRecentSessions, mapRecentSession } from '../../../lib/sessions'

/**
 * GET /api/sidebar-data
 *
 * Returns projects (filtered by repo access) and recent sessions for the sidebar.
 * This replaces the server-side data fetching that was blocking layout rendering.
 */
export async function GET() {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const [allProjects, recentSessions] = await Promise.all([
    getProjects(),
    getRecentSessions(user.id, 8),
  ])

  const accessibleRepoKeys = await filterAccessibleRepos(
    user.accessToken,
    allProjects.map((p) => ({ owner: p.owner, repoName: p.repoName })),
  )

  const projects = allProjects.filter((p) =>
    accessibleRepoKeys.has(`${p.owner}/${p.repoName}`),
  )

  return NextResponse.json({
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      teams: p.teams.map((t) => ({ id: t.id, name: t.name, colour: t.colour })),
    })),
    recentSessions: recentSessions.map(mapRecentSession),
  })
}
