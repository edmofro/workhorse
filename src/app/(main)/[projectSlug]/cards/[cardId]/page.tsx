import { notFound } from 'next/navigation'
import { prisma } from '../../../../../lib/prisma'
import { CardTab } from '../../../../../components/card/CardTab'

interface Props {
  params: Promise<{ cardId: string }>
}

export default async function CardPage({ params }: Props) {
  const { cardId } = await params

  const card = await prisma.card.findUnique({
    where: { identifier: cardId },
    include: {
      team: { include: { project: true } },
      assignee: true,
      dependsOn: { include: { parent: true } },
      dependedOnBy: { include: { dependent: true } },
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

  if (!card) notFound()

  const users = await prisma.user.findMany({ orderBy: { displayName: 'asc' } })
  const teams = await prisma.team.findMany({
    where: { projectId: card.team.projectId },
    orderBy: { name: 'asc' },
  })

  return (
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
}
