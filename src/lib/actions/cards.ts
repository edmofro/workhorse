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
      comments: { include: { user: true }, orderBy: { createdAt: 'asc' } },
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

export async function addComment(cardId: string, content: string) {
  const user = await requireUser()
  const comment = await prisma.cardComment.create({
    data: { cardId, userId: user.id, content },
    include: { user: true },
  })

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
