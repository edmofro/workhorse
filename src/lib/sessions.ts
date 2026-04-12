import { prisma } from './prisma'

/**
 * Fetch recent conversation sessions for a user, with card and team context.
 * Shared between the main layout (server component) and the sessions API route.
 */
export async function getRecentSessions(userId: string, limit: number = 8) {
  return prisma.conversationSession.findMany({
    where: { userId, dismissedFromRecent: false },
    orderBy: { lastMessageAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      messageCount: true,
      cardId: true,
      lastMessageAt: true,
      createdAt: true,
      card: {
        select: {
          identifier: true,
          title: true,
          status: true,
          team: {
            select: {
              colour: true,
              project: { select: { name: true } },
            },
          },
        },
      },
      team: {
        select: {
          colour: true,
          project: { select: { name: true } },
        },
      },
    },
  })
}

type RecentSessionRow = Awaited<ReturnType<typeof getRecentSessions>>[number]

/** Map a recent session row to a serialisable shape for the API / sidebar. */
export function mapRecentSession(s: RecentSessionRow) {
  return {
    id: s.id,
    title: s.title,
    messageCount: s.messageCount,
    lastMessageAt: s.lastMessageAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
    cardId: s.cardId,
    cardIdentifier: s.card?.identifier ?? null,
    cardTitle: s.card?.title ?? null,
    cardStatus: s.card?.status ?? null,
    teamColour: s.card?.team?.colour ?? s.team?.colour ?? null,
    projectName: s.card?.team?.project?.name ?? s.team?.project?.name ?? null,
  }
}
