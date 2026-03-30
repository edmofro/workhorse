import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { requireProjectAccess } from '../../../lib/auth/github'
import { prisma } from '../../../lib/prisma'

/**
 * GET /api/project-board?project=<slug>
 *
 * Returns project with teams, cards, and all users for the board view.
 */
export async function GET(request: NextRequest) {
  const user = await requireUser()
  const { searchParams } = new URL(request.url)
  const projectSlug = searchParams.get('project')
  if (!projectSlug) {
    return NextResponse.json({ error: 'project param required' }, { status: 400 })
  }

  // Lightweight lookup for auth check before expensive query
  const projectBasic = await prisma.project.findFirst({
    where: { name: { equals: decodeURIComponent(projectSlug), mode: 'insensitive' } },
    select: { owner: true, repoName: true },
  })

  if (!projectBasic) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const hasAccess = await requireProjectAccess(user.accessToken, projectBasic.owner, projectBasic.repoName)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [project, users] = await Promise.all([
    prisma.project.findFirst({
      where: { name: { equals: decodeURIComponent(projectSlug), mode: 'insensitive' } },
      include: {
        teams: {
          include: {
            cards: {
              select: {
                id: true,
                identifier: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                tags: true,
                assignee: { select: { id: true, displayName: true } },
                team: { select: { id: true, name: true, colour: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: 200,
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, displayName: true },
      orderBy: { displayName: 'asc' },
    }),
  ])

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const cards = project.teams.flatMap((t) =>
    t.cards.map((c) => ({
      id: c.id,
      identifier: c.identifier,
      title: c.title,
      description: c.description,
      status: c.status,
      priority: c.priority,
      tags: c.tags,
      assignee: c.assignee
        ? { id: c.assignee.id, displayName: c.assignee.displayName }
        : null,
      team: { id: c.team.id, name: c.team.name, colour: c.team.colour },
    })),
  )

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      teams: project.teams.map((t) => ({ id: t.id, name: t.name, colour: t.colour })),
    },
    cards,
    users: users.map((u) => ({ id: u.id, displayName: u.displayName })),
  })
}
