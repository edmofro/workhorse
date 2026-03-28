'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'

export async function getSpecs(featureId: string) {
  return prisma.featureSpec.findMany({
    where: { featureId },
    orderBy: { filePath: 'asc' },
  })
}

export async function getSpec(id: string) {
  return prisma.featureSpec.findUnique({ where: { id } })
}

export async function createSpec(data: {
  featureId: string
  filePath: string
  isNew: boolean
  content: string
}) {
  const spec = await prisma.featureSpec.create({ data })
  revalidatePath('/')
  return spec
}

export async function updateSpecContent(id: string, content: string) {
  return prisma.featureSpec.update({
    where: { id },
    data: { content },
  })
}

export async function deleteSpec(id: string) {
  await prisma.featureSpec.delete({ where: { id } })
  revalidatePath('/')
}

export async function upsertSpec(data: {
  featureId: string
  filePath: string
  isNew: boolean
  content: string
}) {
  const spec = await prisma.featureSpec.upsert({
    where: {
      featureId_filePath: {
        featureId: data.featureId,
        filePath: data.filePath,
      },
    },
    create: data,
    update: { content: data.content },
  })
  return spec
}
