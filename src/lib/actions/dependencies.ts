'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'

export async function addDependency(dependentId: string, parentId: string) {
  // Check for cycles
  const hasCycle = await detectCycle(dependentId, parentId)
  if (hasCycle) {
    throw new Error('Adding this dependency would create a circular dependency')
  }

  await prisma.featureDependency.create({
    data: { dependentId, parentId },
  })
  revalidatePath('/')
}

export async function removeDependency(dependentId: string, parentId: string) {
  await prisma.featureDependency.delete({
    where: {
      dependentId_parentId: { dependentId, parentId },
    },
  })
  revalidatePath('/')
}

export async function getDependencies(featureId: string) {
  const [dependsOn, dependedOnBy] = await Promise.all([
    prisma.featureDependency.findMany({
      where: { dependentId: featureId },
      include: { parent: true },
    }),
    prisma.featureDependency.findMany({
      where: { parentId: featureId },
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
    const deps = await prisma.featureDependency.findMany({
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

export async function searchFeatures(query: string, excludeId?: string) {
  return prisma.feature.findMany({
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
