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
 * Map of conversation session ID → AbortController for running agents.
 * Used to cancel a background agent when the user clicks Stop.
 */
const runningAgents = new Map<string, AbortController>()

/** Register an abort controller for a running agent session. */
export function registerAgentAbort(convSessionId: string, controller: AbortController): void {
  runningAgents.set(convSessionId, controller)
}

/** Cancel a running agent session. Returns true if cancelled. */
export function cancelAgent(convSessionId: string): boolean {
  const controller = runningAgents.get(convSessionId)
  if (!controller) return false
  controller.abort()
  runningAgents.delete(convSessionId)
  return true
}

/**
 * Release the advisory lock, clear agentActiveAt, close the session channel,
 * and remove any registered abort controller.
 * Shared teardown used on both success and error paths.
 */
export async function cleanupAgentSession(convSessionId: string): Promise<void> {
  runningAgents.delete(convSessionId)
  await releaseAdvisoryLock(convSessionId)
  await prisma.conversationSession.update({
    where: { id: convSessionId },
    data: { agentActiveAt: null },
  }).catch(() => {})
  closeSessionChannel(convSessionId)
}
