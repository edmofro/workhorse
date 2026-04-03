import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { hasProjectAccess } from '../../../lib/auth/github'
import { prisma } from '../../../lib/prisma'

/**
 * GET /api/card-detail?cardId=<identifier>
 *
 * Returns card data from the database only — no git or GitHub operations.
 * Worktree files and project specs are loaded separately via /api/card-files
 * so the card UI can render immediately while slow git operations load in
 * the background.
 */
export async function GET(request: NextRequest) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const cardId = searchParams.get('cardId')
  if (!cardId) {
    return NextResponse.json({ error: 'cardId param required' }, { status: 400 })
  }

  const card = await prisma.card.findUnique({
    where: { identifier: cardId },
    include: {
      team: { include: { project: true } },
      assignee: true,
      dependsOn: { include: { parent: { select: { identifier: true, title: true } } } },
      attachments: { where: { commentId: null }, orderBy: { createdAt: 'asc' } },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: true },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: true, attachments: true },
        take: 50,
      },
    },
  })

  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  if (!await hasProjectAccess(user.accessToken, card.team.project.owner, card.team.project.repoName)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [users, teams, sessions] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, displayName: true },
      orderBy: { displayName: 'asc' },
    }),
    prisma.team.findMany({
      where: { projectId: card.team.projectId },
      orderBy: { name: 'asc' },
    }),
    prisma.conversationSession.findMany({
      where: { cardId: card.id },
      orderBy: { lastMessageAt: 'desc' },
      take: 20,
    }),
  ])

  // Parse touchedFiles
  let touchedFiles: string[] = []
  try {
    const parsed = JSON.parse(card.touchedFiles)
    touchedFiles = Array.isArray(parsed) ? parsed : []
  } catch {
    // ignore
  }

  return NextResponse.json({
    card: {
      id: card.id,
      identifier: card.identifier,
      title: card.title,
      description: card.description,
      status: card.status,
      priority: card.priority,
      tags: card.tags,
      cardBranch: card.cardBranch,
      prUrl: card.prUrl,
      touchedFiles,
      team: { id: card.team.id, name: card.team.name, colour: card.team.colour },
      project: {
        id: card.team.project.id,
        name: card.team.project.name,
        owner: card.team.project.owner,
        repoName: card.team.project.repoName,
        defaultBranch: card.team.project.defaultBranch,
      },
      assignee: card.assignee
        ? { id: card.assignee.id, displayName: card.assignee.displayName }
        : null,
      dependsOn: card.dependsOn.map((d) => ({
        identifier: d.parent.identifier,
        title: d.parent.title,
      })),
      attachments: card.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
      })),
      activities: card.activities.map((a) => ({
        id: a.id,
        action: a.action,
        details: a.details,
        createdAt: a.createdAt.toISOString(),
        user: a.user ? { displayName: a.user.displayName, avatarUrl: a.user.avatarUrl } : null,
      })),
      comments: card.comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        user: { id: c.user.id, displayName: c.user.displayName, avatarUrl: c.user.avatarUrl },
        attachments: c.attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          mimeType: a.mimeType,
          fileSize: a.fileSize,
        })),
      })),
    },
    users: users.map((u) => ({ id: u.id, displayName: u.displayName })),
    teams: teams.map((t) => ({ id: t.id, name: t.name, colour: t.colour })),
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      messageCount: s.messageCount,
      lastMessageAt: s.lastMessageAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    })),
  })
}
