'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'

export async function getMockups(featureId: string) {
  return prisma.mockup.findMany({
    where: { featureId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getMockup(id: string) {
  return prisma.mockup.findUnique({ where: { id } })
}

export async function createMockup(data: {
  featureId: string
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
