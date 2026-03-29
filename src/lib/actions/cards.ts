'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'
import { requireUser } from '../auth/session'

export async function getCards(teamIds: string[]) {
  return prisma.card.findMany({
    where: { teamId: { in: teamIds } },
    include: {
      team: true,
      assignee: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCard(identifier: string) {
  return prisma.card.findUnique({
    where: { identifier },
    include: {
      team: { include: { project: true } },
      assignee: true,
      mockups: true,
      comments: {
        include: { user: true, attachments: true },
        orderBy: { createdAt: 'asc' },
      },
      attachments: { where: { commentId: null }, orderBy: { createdAt: 'asc' } },
      dependsOn: { include: { parent: true } },
      dependedOnBy: { include: { dependent: true } },
    },
  })
}

export async function createCard(data: {
  title: string
  description?: string
  teamId: string
  assigneeId?: string
  priority?: string
  tags?: string[]
}) {
  await requireUser()

  // Generate next identifier
  const lastCard = await prisma.card.findFirst({
    orderBy: { identifier: 'desc' },
  })

  let nextNum = 1
  if (lastCard) {
    const match = lastCard.identifier.match(/WH-(\d+)/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  const identifier = `WH-${String(nextNum).padStart(3, '0')}`

  const card = await prisma.card.create({
    data: {
      identifier,
      title: data.title,
      description: data.description,
      teamId: data.teamId,
      assigneeId: data.assigneeId,
      priority: data.priority ?? 'MEDIUM',
      tags: JSON.stringify(data.tags ?? []),
    },
  })

  revalidatePath('/')
  return card
}

export async function updateCard(
  id: string,
  data: {
    title?: string
    description?: string
    status?: string
    priority?: string
    teamId?: string
    assigneeId?: string | null
    tags?: string[]
  },
) {
  await requireUser()

  const updateData: Record<string, unknown> = { ...data }
  if (data.tags) {
    updateData.tags = JSON.stringify(data.tags)
  }

  const card = await prisma.card.update({
    where: { id },
    data: updateData,
  })

  revalidatePath('/')
  return card
}

export async function deleteCard(id: string) {
  await requireUser()
  await prisma.card.delete({ where: { id } })
  revalidatePath('/')
}

export async function getProjectCards(projectId: string) {
  const teams = await prisma.team.findMany({
    where: { projectId },
    select: { id: true },
  })
  const teamIds = teams.map((t) => t.id)

  return prisma.card.findMany({
    where: { teamId: { in: teamIds } },
    include: {
      team: true,
      assignee: true,
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
}

/**
 * Create a card with a placeholder title, intended for quick-start flows
 * (e.g. clicking edit on a spec in the explorer). The title is updated
 * automatically after the first edit session once we know the user's intent.
 */
export async function createQuickCard(data: {
  teamId: string
  specPath?: string
}) {
  await requireUser()

  const lastCard = await prisma.card.findFirst({
    orderBy: { identifier: 'desc' },
  })

  let nextNum = 1
  if (lastCard) {
    const match = lastCard.identifier.match(/WH-(\d+)/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  const identifier = `WH-${String(nextNum).padStart(3, '0')}`

  const card = await prisma.card.create({
    data: {
      identifier,
      title: 'Untitled spec',
      teamId: data.teamId,
      status: 'SPECIFYING',
      priority: 'MEDIUM',
      tags: JSON.stringify([]),
    },
  })

  revalidatePath('/')
  return card
}

/**
 * Update a card's title based on spec content, used when exiting edit mode
 * on a card that still has the placeholder title.
 */
export async function updateCardTitleFromSpec(
  cardId: string,
  specTitle: string,
) {
  await requireUser()

  const card = await prisma.card.findUnique({ where: { id: cardId } })
  if (!card) return null
  if (card.title !== 'Untitled spec') return card

  const title = specTitle.trim() || 'Untitled spec'
  const updated = await prisma.card.update({
    where: { id: cardId },
    data: { title },
  })

  revalidatePath('/')
  return updated
}

export async function addComment(
  cardId: string,
  content: string,
  attachmentIds?: string[],
) {
  const user = await requireUser()
  const comment = await prisma.cardComment.create({
    data: { cardId, userId: user.id, content },
    include: { user: true, attachments: true },
  })

  // Associate any uploaded attachments with this comment
  if (attachmentIds && attachmentIds.length > 0) {
    await prisma.attachment.updateMany({
      where: { id: { in: attachmentIds } },
      data: { commentId: comment.id, cardId },
    })
  }

  revalidatePath('/')
  return comment
}

export async function getCardActivities(cardId: string) {
  return prisma.cardActivity.findMany({
    where: { cardId },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  })
}
