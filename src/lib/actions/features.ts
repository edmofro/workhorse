'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'

export async function getFeatures(teamIds: string[]) {
  return prisma.feature.findMany({
    where: { teamId: { in: teamIds } },
    include: {
      team: true,
      assignee: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getFeature(identifier: string) {
  return prisma.feature.findUnique({
    where: { identifier },
    include: {
      team: { include: { product: true } },
      assignee: true,
      specs: true,
      mockups: true,
      dependsOn: { include: { parent: true } },
      dependedOnBy: { include: { dependent: true } },
    },
  })
}

export async function createFeature(data: {
  title: string
  description?: string
  teamId: string
  assigneeId?: string
  priority?: string
  tags?: string[]
}) {
  // Generate next identifier
  const lastFeature = await prisma.feature.findFirst({
    orderBy: { identifier: 'desc' },
  })

  let nextNum = 1
  if (lastFeature) {
    const match = lastFeature.identifier.match(/WH-(\d+)/)
    if (match) nextNum = parseInt(match[1], 10) + 1
  }

  const identifier = `WH-${String(nextNum).padStart(3, '0')}`

  const feature = await prisma.feature.create({
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
  return feature
}

export async function updateFeature(
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
  const updateData: Record<string, unknown> = { ...data }
  if (data.tags) {
    updateData.tags = JSON.stringify(data.tags)
    delete updateData.tags
    updateData.tags = JSON.stringify(data.tags)
  }

  const feature = await prisma.feature.update({
    where: { id },
    data: updateData,
  })

  revalidatePath('/')
  return feature
}

export async function deleteFeature(id: string) {
  await prisma.feature.delete({ where: { id } })
  revalidatePath('/')
}

export async function getProductFeatures(productId: string) {
  const teams = await prisma.team.findMany({
    where: { productId },
    select: { id: true },
  })
  const teamIds = teams.map((t) => t.id)

  return prisma.feature.findMany({
    where: { teamId: { in: teamIds } },
    include: {
      team: true,
      assignee: true,
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
}
