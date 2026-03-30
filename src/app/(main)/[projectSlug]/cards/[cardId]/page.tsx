import { notFound } from 'next/navigation'
import { prisma } from '../../../../../lib/prisma'
import { CardTab } from '../../../../../components/card/CardTab'
import { CardWorkspace } from '../../../../../components/card/CardWorkspace'
import { getChangedFiles, readWorktreeFile, worktreeExists } from '../../../../../lib/git/worktree'
import { getCurrentUser } from '../../../../../lib/auth/session'
import { fetchRepoSpecTree } from '../../../../../lib/git/specTree'
import { isMockupPath } from '../../../../../lib/paths'

interface Props {
  params: Promise<{ cardId: string }>
  searchParams: Promise<{ session?: string }>
}

export default async function CardPage({ params, searchParams }: Props) {
  const { cardId } = await params
  const { session: sessionParam } = await searchParams

  const card = await prisma.card.findUnique({
    where: { identifier: cardId },
    include: {
      team: { include: { project: true } },
      assignee: true,
      dependsOn: { include: { parent: true } },
      dependedOnBy: { include: { dependent: true } },
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

  if (!card) notFound()

  const { owner, repoName, defaultBranch } = card.team.project

  // Parallelise independent fetches
  const [users, teams, hasWorktree, currentUser, sessions] = await Promise.all([
    prisma.user.findMany({ orderBy: { displayName: 'asc' } }),
    prisma.team.findMany({
      where: { projectId: card.team.projectId },
      orderBy: { name: 'asc' },
    }),
    worktreeExists(owner, repoName, card.identifier),
    getCurrentUser(),
    prisma.conversationSession.findMany({
      where: { cardId: card.id },
      orderBy: { lastMessageAt: 'desc' },
      take: 20,
    }),
  ])

  // Load spec files and code files from worktree if it exists
  let initialFiles: { filePath: string; isNew: boolean; content: string }[] = []
  let initialCodeFiles: { filePath: string; isNew: boolean }[] = []

  if (hasWorktree) {
    const { workhorseFiles, codeFiles } = await getChangedFiles(
      owner, repoName, card.identifier, defaultBranch,
    )

    const specFiles = workhorseFiles.filter((f) =>
      f.filePath.startsWith('.workhorse/specs/') ||
      isMockupPath(f.filePath),
    )

    initialFiles = await Promise.all(
      specFiles.map(async (f) => {
        const content = await readWorktreeFile(
          owner, repoName, card.identifier, f.filePath,
        ) ?? ''
        return { ...f, content }
      }),
    )

    initialCodeFiles = codeFiles
  }

  // Load project specs
  let projectSpecs: { filePath: string; content: string }[] = []
  if (currentUser) {
    try {
      const specTree = await fetchRepoSpecTree(
        currentUser.accessToken, owner, repoName, defaultBranch,
      )
      projectSpecs = specTree.files.map((f) => ({
        filePath: f.path,
        content: f.content,
      }))
    } catch {
      // If we can't load project specs, continue without them
    }
  }

  // Map mockups for the workspace
  const mockupData = card.mockups.map((m) => ({
    id: m.id,
    title: m.title,
    html: m.html,
    filePath: `.workhorse/design/mockups/${card.identifier}/${m.title.toLowerCase().replace(/\s+/g, '-')}.html`,
  }))

  // Render CardTab content as server-rendered children
  const cardTabContent = (
    <CardTab
      card={{
        id: card.id,
        identifier: card.identifier,
        title: card.title,
        description: card.description,
        status: card.status,
        priority: card.priority,
        tags: card.tags,
        team: { id: card.team.id, name: card.team.name, colour: card.team.colour },
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
      }}
      users={users.map((u) => ({ id: u.id, displayName: u.displayName }))}
      teams={teams.map((t) => ({ id: t.id, name: t.name, colour: t.colour }))}
    />
  )

  return (
    <CardWorkspace
      card={{
        id: card.id,
        identifier: card.identifier,
        title: card.title,
        status: card.status,
        cardBranch: card.cardBranch,
      }}
      cardTabContent={cardTabContent}
      initialFiles={initialFiles}
      initialCodeFiles={initialCodeFiles}
      mockups={mockupData}
      projectSpecs={projectSpecs}
      sessions={sessions.map((s) => ({
        id: s.id,
        title: s.title,
        messageCount: s.messageCount,
        lastMessageAt: s.lastMessageAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
      }))}
      initialSessionId={sessionParam ?? null}
    />
  )
}
