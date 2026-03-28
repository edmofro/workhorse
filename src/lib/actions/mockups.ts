'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'

export async function getMockups(cardId: string) {
  return prisma.mockup.findMany({
    where: { cardId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getMockup(id: string) {
  return prisma.mockup.findUnique({ where: { id } })
}

export async function createMockup(data: {
  cardId: string
  title: string
  html: string
}) {
  const mockup = await prisma.mockup.create({ data })
  revalidatePath('/')
  return mockup
}

export async function updateMockup(id: string, data: { title?: string; html?: string }) {
  const mockup = await prisma.mockup.update({ where: { id }, data })
  revalidatePath('/')
  return mockup
}

export async function deleteMockup(id: string) {
  await prisma.mockup.delete({ where: { id } })
  revalidatePath('/')
}
