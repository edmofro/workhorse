'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'

export async function getProducts() {
  return prisma.product.findMany({
    include: { teams: true },
    orderBy: { name: 'asc' },
  })
}

export async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { teams: { include: { features: true } } },
  })
}

export async function getProductByName(name: string) {
  return prisma.product.findFirst({
    where: { name: { equals: name } },
    include: { teams: true },
  })
}

export async function createProduct(data: {
  name: string
  githubUrl: string
  owner: string
  repoName: string
  defaultBranch?: string
}) {
  const product = await prisma.product.create({ data })
  revalidatePath('/')
  return product
}

export async function updateProduct(
  id: string,
  data: {
    name?: string
    githubUrl?: string
    owner?: string
    repoName?: string
    defaultBranch?: string
  },
) {
  const product = await prisma.product.update({ where: { id }, data })
  revalidatePath('/')
  return product
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } })
  revalidatePath('/')
}
