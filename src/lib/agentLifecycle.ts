/**
 * Shared agent session lifecycle utilities.
 *
 * Extracted to avoid duplication between the agent-session route
 * and the worktree recovery module.
 */

import { prisma } from './prisma'
import { releaseAdvisoryLock } from './advisoryLock'
import { close as closeSessionChannel } from './sessionEvents'

/**
 * Release the advisory lock, clear agentActiveAt, and close the session channel.
 * Shared teardown used on both success and error paths.
 */
export async function cleanupAgentSession(convSessionId: string): Promise<void> {
  await releaseAdvisoryLock(convSessionId)
  await prisma.conversationSession.update({
    where: { id: convSessionId },
    data: { agentActiveAt: null },
  }).catch(() => {})
  closeSessionChannel(convSessionId)
}
