'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'

export async function addDependency(dependentId: string, parentId: string) {
  // Check for cycles
  const hasCycle = await detectCycle(dependentId, parentId)
  if (hasCycle) {
    throw new Error('Adding this dependency would create a circular dependency')
  }

  await prisma.cardDependency.create({
    data: { dependentId, parentId },
  })
  revalidatePath('/')
}

export async function removeDependency(dependentId: string, parentId: string) {
  await prisma.cardDependency.delete({
    where: {
      dependentId_parentId: { dependentId, parentId },
    },
  })
  revalidatePath('/')
}

export async function getDependencies(cardId: string) {
  const [dependsOn, dependedOnBy] = await Promise.all([
    prisma.cardDependency.findMany({
      where: { dependentId: cardId },
      include: { parent: true },
    }),
    prisma.cardDependency.findMany({
      where: { parentId: cardId },
      include: { dependent: true },
    }),
  ])

  return { dependsOn, dependedOnBy }
}

async function detectCycle(dependentId: string, newParentId: string): Promise<boolean> {
  // BFS from newParentId to see if we can reach dependentId
  const visited = new Set<string>()
  const queue = [newParentId]

  // First check: the dependent IS the parent
  if (dependentId === newParentId) return true

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)

    // Get what `current` depends on
    const deps = await prisma.cardDependency.findMany({
      where: { dependentId: current },
      select: { parentId: true },
    })

    for (const dep of deps) {
      if (dep.parentId === dependentId) return true
      queue.push(dep.parentId)
    }
  }

  return false
}

export async function searchCards(query: string, excludeId?: string) {
  return prisma.card.findMany({
    where: {
      AND: [
        excludeId ? { id: { not: excludeId } } : {},
        {
          OR: [
            { identifier: { contains: query } },
            { title: { contains: query } },
          ],
        },
      ],
    },
    take: 10,
    orderBy: { identifier: 'asc' },
  })
}

export async function checkParentsCommitted(cardId: string): Promise<{ canCommit: boolean; uncommittedParents: string[] }> {
  const dependencies = await prisma.cardDependency.findMany({
    where: { dependentId: cardId },
    include: { parent: true },
  })

  const uncommittedParents = dependencies
    .filter((d) => !d.parent.specBranch)
    .map((d) => d.parent.identifier)

  return {
    canCommit: uncommittedParents.length === 0,
    uncommittedParents,
  }
}

export async function checkParentsSpecComplete(cardId: string): Promise<{ canComplete: boolean; incompleteParents: string[] }> {
  const dependencies = await prisma.cardDependency.findMany({
    where: { dependentId: cardId },
    include: { parent: true },
  })

  const incompleteParents = dependencies
    .filter((d) => d.parent.status !== 'SPEC_COMPLETE')
    .map((d) => d.parent.identifier)

  return {
    canComplete: incompleteParents.length === 0,
    incompleteParents,
  }
}
