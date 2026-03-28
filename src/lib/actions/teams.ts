'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'

export async function getTeams(productId: string) {
  return prisma.team.findMany({
    where: { productId },
    include: { features: true },
    orderBy: { name: 'asc' },
  })
}

export async function createTeam(data: {
  name: string
  colour: string
  productId: string
}) {
  const team = await prisma.team.create({ data })
  revalidatePath('/')
  return team
}

export async function updateTeam(
  id: string,
  data: { name?: string; colour?: string },
) {
  const team = await prisma.team.update({ where: { id }, data })
  revalidatePath('/')
  return team
}

export async function deleteTeam(id: string) {
  await prisma.team.delete({ where: { id } })
  revalidatePath('/')
}
