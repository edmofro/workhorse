/**
 * Worktree recovery on server startup.
 * Recreates worktrees from branches for all active cards.
 */

import { prisma } from '../prisma'
import {
  ensureBareClone,
  createWorktree,
  worktreeExists,
  removeWorktree,
} from './worktree'

/**
 * Recover worktrees for all active cards.
 * Called on server startup.
 */
export async function recoverWorktrees(): Promise<void> {
  // Find all active cards (SPECIFYING or IMPLEMENTING) with branches
  const activeCards = await prisma.card.findMany({
    where: {
      status: { in: ['SPECIFYING', 'IMPLEMENTING'] },
      cardBranch: { not: null },
    },
    include: {
      team: { include: { project: true } },
    },
  })

  for (const card of activeCards) {
    const { owner, repoName, defaultBranch } = card.team.project

    try {
      const exists = await worktreeExists(owner, repoName, card.identifier)
      if (!exists && card.cardBranch) {
        console.log(`Recovering worktree for card ${card.identifier}...`)

        // Ensure bare clone exists — requires a service token
        const serviceToken = process.env.GITHUB_SERVICE_TOKEN
        if (!serviceToken) {
          console.warn(`Skipping recovery for card ${card.identifier}: GITHUB_SERVICE_TOKEN not set`)
          continue
        }
        await ensureBareClone(owner, repoName, serviceToken)

        await createWorktree(
          owner,
          repoName,
          card.identifier,
          card.cardBranch,
          defaultBranch,
        )

        console.log(`Recovered worktree for card ${card.identifier}`)
      }
    } catch (err) {
      console.error(`Failed to recover worktree for card ${card.identifier}:`, err)
    }
  }
}

/**
 * Clean up stale worktrees (no activity for 24 hours).
 */
export async function cleanupStaleWorktrees(): Promise<void> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Find cards with stale worktrees
  const staleCards = await prisma.card.findMany({
    where: {
      lastActivityAt: { lt: twentyFourHoursAgo },
      cardBranch: { not: null },
      status: { notIn: ['COMPLETE'] },
    },
    include: {
      team: { include: { project: true } },
    },
  })

  for (const card of staleCards) {
    const { owner, repoName } = card.team.project

    try {
      const exists = await worktreeExists(owner, repoName, card.identifier)
      if (exists) {
        console.log(`Removing stale worktree for card ${card.identifier}...`)
        await removeWorktree(owner, repoName, card.identifier)
        console.log(`Removed stale worktree for card ${card.identifier}`)
      }
    } catch (err) {
      console.error(`Failed to remove stale worktree for card ${card.identifier}:`, err)
    }
  }

  // Also remove worktrees for COMPLETE cards
  const completeCards = await prisma.card.findMany({
    where: {
      status: 'COMPLETE',
      cardBranch: { not: null },
    },
    include: {
      team: { include: { project: true } },
    },
  })

  for (const card of completeCards) {
    const { owner, repoName } = card.team.project

    try {
      const exists = await worktreeExists(owner, repoName, card.identifier)
      if (exists) {
        await removeWorktree(owner, repoName, card.identifier)
      }
    } catch (err) {
      console.error(`Failed to remove worktree for complete card ${card.identifier}:`, err)
    }
  }
}
