'use server'

import { prisma } from '../prisma'

export async function getMessages(featureId: string) {
  return prisma.specMessage.findMany({
    where: { featureId },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createMessage(data: {
  featureId: string
  userId?: string
  role: string
  content: string
  metadata?: string
}) {
  return prisma.specMessage.create({ data })
}
