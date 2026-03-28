'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'

export async function getSpecs(cardId: string) {
  return prisma.cardSpec.findMany({
    where: { cardId },
    orderBy: { filePath: 'asc' },
  })
}

export async function getSpec(id: string) {
  return prisma.cardSpec.findUnique({ where: { id } })
}

export async function createSpec(data: {
  cardId: string
  filePath: string
  isNew: boolean
  content: string
}) {
  const spec = await prisma.cardSpec.create({ data })
  revalidatePath('/')
  return spec
}

export async function createSpecWithBaseline(data: {
  cardId: string
  filePath: string
  isNew: boolean
  content: string
  baselineContent?: string
}) {
  const spec = await prisma.cardSpec.create({ data })
  revalidatePath('/')
  return spec
}

export async function updateSpecContent(id: string, content: string) {
  return prisma.cardSpec.update({
    where: { id },
    data: { content },
  })
}

export async function deleteSpec(id: string) {
  await prisma.cardSpec.delete({ where: { id } })
  revalidatePath('/')
}

export async function upsertSpec(data: {
  cardId: string
  filePath: string
  isNew: boolean
  content: string
}) {
  const spec = await prisma.cardSpec.upsert({
    where: {
      cardId_filePath: {
        cardId: data.cardId,
        filePath: data.filePath,
      },
    },
    create: data,
    update: { content: data.content },
  })
  return spec
}
