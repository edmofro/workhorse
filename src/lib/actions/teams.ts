'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'

export async function getTeams(projectId: string) {
  return prisma.team.findMany({
    where: { projectId },
    include: { cards: true, members: true },
    orderBy: { name: 'asc' },
  })
}

export async function createTeam(data: {
  name: string
  colour: string
  projectId: string
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

export async function joinTeam(userId: string, teamId: string) {
  await prisma.teamMember.upsert({
    where: { userId_teamId: { userId, teamId } },
    create: { userId, teamId },
    update: {},
  })
  revalidatePath('/')
}

export async function leaveTeam(userId: string, teamId: string) {
  await prisma.teamMember.deleteMany({
    where: { userId, teamId },
  })
  revalidatePath('/')
}

export async function getUserTeamIds(userId: string): Promise<string[]> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  })
  return memberships.map((m) => m.teamId)
}
