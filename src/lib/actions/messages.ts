'use server'

import { prisma } from '../prisma'

export async function getMessages(cardId: string) {
  return prisma.specMessage.findMany({
    where: { cardId },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createMessage(data: {
  cardId: string
  userId?: string
  role: string
  content: string
  metadata?: string
}) {
  return prisma.specMessage.create({ data })
}
