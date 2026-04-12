/**
 * Worktree recovery, stale state cleanup, and orphan detection on server startup.
 * Recreates worktrees from branches for all active cards, detects orphaned
 * agent sessions (process died mid-stream), and auto-resumes them.
 */

import { prisma } from '../prisma'
import { clearStaleSessions } from '../sessionEvents'
import { isLockOrphaned } from '../advisoryLock'
import {
  ensureBareClone,
  createWorktree,
  worktreeExists,
  removeWorktree,
  worktreePath,
} from './worktree'
import { branchNameFromCard } from './branchNaming'

/**
 * Clear agentActiveAt for all sessions that were left in
 * an active state by a server crash or redeploy.
 */
export async function clearStaleActiveSessions(): Promise<void> {
  const count = await clearStaleSessions()
  if (count > 0) {
    console.log(`Cleared ${count} stale active session(s)`)
  }
}

/**
 * Detect orphaned agent sessions and auto-resume them.
 * An orphaned session has agentActiveAt set but no advisory lock held.
 *
 * Called on server startup after clearStaleActiveSessions.
 */
export async function detectAndResumeOrphans(): Promise<void> {
  // Query sessions where agentActiveAt is non-null
  const activeSessions = await prisma.conversationSession.findMany({
    where: {
      agentActiveAt: { not: null },
    },
    select: {
      id: true,
      agentSessionId: true,
      cardId: true,
      userId: true,
      card: {
        select: {
          identifier: true,
          title: true,
          status: true,
          cardBranch: true,
          team: {
            select: {
              id: true,
              colour: true,
              project: {
                select: {
                  owner: true,
                  repoName: true,
                  defaultBranch: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          displayName: true,
          githubUsername: true,
          accessToken: true,
        },
      },
    },
  })

  for (const session of activeSessions) {
    try {
      const orphaned = await isLockOrphaned(session.id)
      if (!orphaned) continue // Lock still held — agent is running normally

      console.log(`Detected orphaned session ${session.id}`)

      // If no SDK session ID or no card, just clear the flag
      if (!session.agentSessionId || !session.card) {
        await prisma.conversationSession.update({
          where: { id: session.id },
          data: { agentActiveAt: null },
        })
        console.log(`Cleared orphaned session ${session.id} (no SDK session or card)`)
        continue
      }

      // Attempt auto-resume via the Agent SDK
      try {
        const { query } = await import('@anthropic-ai/claude-agent-sdk')
        const { publish, close } = await import('../sessionEvents')
        const { acquireAdvisoryLock, releaseAdvisoryLock } = await import('../advisoryLock')

        const card = session.card
        const project = card.team.project
        const branchName = card.cardBranch ?? branchNameFromCard(card.identifier)

        // Ensure worktree exists
        const serviceToken = process.env.GITHUB_SERVICE_TOKEN ?? session.user.accessToken
        await ensureBareClone(project.owner, project.repoName, serviceToken)
        await createWorktree(project.owner, project.repoName, card.identifier, branchName, project.defaultBranch)
        const wtPath = worktreePath(project.owner, project.repoName, card.identifier)

        // Re-mark as active and acquire lock
        await prisma.conversationSession.update({
          where: { id: session.id },
          data: { agentActiveAt: new Date() },
        })
        await acquireAdvisoryLock(session.id)

        console.log(`Auto-resuming orphaned session ${session.id}`)

        // Run resumed query in background
        void (async () => {
          try {
            const agentQuery = query({
              prompt: 'You were interrupted by a server restart. Continue where you left off.',
              options: {
                cwd: wtPath,
                tools: ['Read', 'Glob', 'Grep', 'Write', 'Edit'],
                permissionMode: 'acceptEdits' as const,
                systemPrompt: { type: 'preset' as const, preset: 'claude_code' as const },
                settingSources: ['project' as const],
                includePartialMessages: true,
                model: 'claude-opus-4-6',
                maxTurns: 10,
                persistSession: true,
                resume: session.agentSessionId ?? undefined,
              },
            })

            for await (const event of agentQuery) {
              publish(session.id, event as Record<string, unknown>)
            }

            // Cleanup
            await releaseAdvisoryLock(session.id)
            await prisma.conversationSession.update({
              where: { id: session.id },
              data: { agentActiveAt: null },
            }).catch(() => {})
            close(session.id)
            console.log(`Auto-resumed session ${session.id} completed`)
          } catch (err) {
            console.error(`Auto-resume failed for session ${session.id}:`, err)
            await releaseAdvisoryLock(session.id)
            await prisma.conversationSession.update({
              where: { id: session.id },
              data: { agentActiveAt: null },
            }).catch(() => {})
            close(session.id)
          }
        })()
      } catch (err) {
        // SDK not available or session expired — graceful degradation
        console.warn(`Cannot resume session ${session.id}, clearing:`, err)
        await prisma.conversationSession.update({
          where: { id: session.id },
          data: { agentActiveAt: null },
        })
      }
    } catch (err) {
      console.error(`Failed to check orphan status for session ${session.id}:`, err)
    }
  }
}

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
