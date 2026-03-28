'use server'

/**
 * Message operations — conversation history is now managed by the Agent SDK.
 * The SDK stores session transcripts on disk, retrievable by session_id.
 * This file is kept as a placeholder for any future message-related operations.
 */

export async function getSessionId(cardId: string): Promise<string | null> {
  // Import lazily to avoid circular dependencies
  const { prisma } = await import('../prisma')

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { agentSessionId: true },
  })

  return card?.agentSessionId ?? null
}
