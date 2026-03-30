import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { hasProjectAccess } from '../../../lib/auth/github'
import { prisma } from '../../../lib/prisma'

/**
 * GET /api/project-lookup?slug=<slug>
 *
 * Lightweight project lookup by slug. Used by specs and design pages
 * that only need basic project info (not the full board with cards).
 */
export async function GET(request: NextRequest) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'slug param required' }, { status: 400 })
  }

  const project = await prisma.project.findFirst({
    where: { name: { equals: decodeURIComponent(slug), mode: 'insensitive' } },
    include: { teams: true },
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  if (!await hasProjectAccess(user.accessToken, project.owner, project.repoName)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    id: project.id,
    name: project.name,
    owner: project.owner,
    repoName: project.repoName,
    defaultBranch: project.defaultBranch,
    teams: project.teams.map((t) => ({ id: t.id, name: t.name, colour: t.colour })),
  })
}
