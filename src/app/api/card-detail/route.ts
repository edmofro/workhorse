import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { hasProjectAccess } from '../../../lib/auth/github'
import { prisma } from '../../../lib/prisma'
import { worktreeExists, getChangedFiles, readWorktreeFile } from '../../../lib/git/worktree'
import { fetchRepoSpecTree } from '../../../lib/git/specTree'
import { isMockupPath } from '../../../lib/paths'

/**
 * GET /api/card-detail?cardId=<identifier>
 *
 * Returns full card data for the card workspace view, including:
 * - Card with all relations (comments, activities, attachments, dependencies, mockups)
 * - Users and teams for the project
 * - Conversation sessions
 * - Worktree files (if worktree exists)
 * - Project specs
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
      dependedOnBy: { include: { dependent: { select: { identifier: true, title: true } } } },
      attachments: { where: { commentId: null }, orderBy: { createdAt: 'asc' } },
      mockups: true,
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

  const { owner, repoName, defaultBranch } = card.team.project

  if (!await hasProjectAccess(user.accessToken, owner, repoName)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [users, teams, hasWorktree, sessions, projectSpecs] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, displayName: true },
      orderBy: { displayName: 'asc' },
    }),
    prisma.team.findMany({
      where: { projectId: card.team.projectId },
      orderBy: { name: 'asc' },
    }),
    worktreeExists(owner, repoName, card.identifier),
    prisma.conversationSession.findMany({
      where: { cardId: card.id },
      orderBy: { lastMessageAt: 'desc' },
      take: 20,
    }),
    (async (): Promise<{ filePath: string; content: string }[]> => {
      try {
        const specTree = await fetchRepoSpecTree(
          user.accessToken, owner, repoName, defaultBranch,
        )
        return specTree.files.map((f) => ({
          filePath: f.path,
          content: f.content,
        }))
      } catch {
        return []
      }
    })(),
  ])

  // Load spec files and code files from worktree if it exists
  const initialFiles: { filePath: string; isNew: boolean; content: string }[] = []
  let initialCodeFiles: { filePath: string; isNew: boolean }[] = []
  if (hasWorktree) {
    const { workhorseFiles, codeFiles } = await getChangedFiles(
      owner, repoName, card.identifier, defaultBranch,
    )
    const specFiles = workhorseFiles.filter((f) =>
      f.filePath.startsWith('.workhorse/specs/') ||
      isMockupPath(f.filePath),
    ).slice(0, 20)
    // Read files in batches of 5 to avoid spawning too many concurrent subprocesses
    for (let i = 0; i < specFiles.length; i += 5) {
      const batch = specFiles.slice(i, i + 5)
      const results = await Promise.all(
        batch.map(async (f) => {
          const content = await readWorktreeFile(
            owner, repoName, card.identifier, f.filePath,
          ) ?? ''
          return { ...f, content }
        }),
      )
      initialFiles.push(...results)
    }
    initialCodeFiles = codeFiles
  }

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
      touchedFiles,
      team: { id: card.team.id, name: card.team.name, colour: card.team.colour },
      project: {
        id: card.team.project.id,
        name: card.team.project.name,
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
      mockups: card.mockups.map((m) => ({
        id: m.id,
        title: m.title,
        html: m.html,
        filePath: `.workhorse/design/mockups/${card.identifier}/${m.title.toLowerCase().replace(/\s+/g, '-')}.html`,
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
    initialFiles,
    initialCodeFiles,
    projectSpecs,
  })
}
