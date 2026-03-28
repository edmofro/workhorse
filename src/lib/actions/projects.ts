'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'

export async function getProjects() {
  return prisma.project.findMany({
    include: { teams: true },
    orderBy: { name: 'asc' },
  })
}

export async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: { teams: { include: { cards: true } } },
  })
}

export async function getProjectByName(name: string) {
  return prisma.project.findFirst({
    where: { name: { equals: name } },
    include: { teams: true },
  })
}

export async function createProject(data: {
  name: string
  githubUrl: string
  owner: string
  repoName: string
  defaultBranch?: string
}) {
  const project = await prisma.project.create({ data })
  revalidatePath('/')
  return project
}

export async function updateProject(
  id: string,
  data: {
    name?: string
    githubUrl?: string
    owner?: string
    repoName?: string
    defaultBranch?: string
  },
) {
  const project = await prisma.project.update({ where: { id }, data })
  revalidatePath('/')
  return project
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } })
  revalidatePath('/')
}
