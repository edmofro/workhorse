'use server'

/**
 * Message operations — conversation history is now managed by the Agent SDK.
 * The SDK stores session transcripts on disk, retrievable by session_id.
 * ConversationSession records track the agentSessionId for each conversation.
 */

export async function getAgentSessionId(conversationSessionId: string): Promise<string | null> {
  const { prisma } = await import('../prisma')

  const session = await prisma.conversationSession.findUnique({
    where: { id: conversationSessionId },
    select: { agentSessionId: true },
  })

  return session?.agentSessionId ?? null
}
