import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { prisma } from '../../../lib/prisma'
import { getRecentSessions, mapRecentSession } from '../../../lib/sessions'

/**
 * GET /api/sessions
 *
 * List sessions for a card (?cardId=xxx) or recent sessions for the current user (?recent=true&limit=8).
 */
export async function GET(request: NextRequest) {
  const user = await requireUser()
  const { searchParams } = new URL(request.url)

  const cardId = searchParams.get('cardId')
  const recent = searchParams.get('recent')
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '8', 10) || 8, 1), 50)

  if (recent === 'true') {
    const sessions = await getRecentSessions(user.id, limit)
    return NextResponse.json({
      sessions: sessions.map(mapRecentSession),
    })
  }

  if (cardId) {
    // Scope to user's own sessions for this card
    const sessions = await prisma.conversationSession.findMany({
      where: { cardId, userId: user.id },
      orderBy: { lastMessageAt: 'desc' },
      take: Math.min(limit, 20),
    })

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        messageCount: s.messageCount,
        lastMessageAt: s.lastMessageAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
      })),
    })
  }

  return NextResponse.json({ error: 'Provide cardId or recent=true' }, { status: 400 })
}

/**
 * POST /api/sessions
 *
 * Create a new conversation session.
 * Body: { cardId?: string, teamId?: string }
 */
export async function POST(request: NextRequest) {
  const user = await requireUser()
  const body = await request.json()
  const { cardId, teamId } = body as { cardId?: string; teamId?: string }

  // If cardId provided, verify it exists and user has access
  let resolvedTeamId = teamId ?? null
  if (cardId) {
    const card = await requireCardAccess(user.id, cardId)
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }
    resolvedTeamId = resolvedTeamId ?? card.teamId
  }

  const session = await prisma.conversationSession.create({
    data: {
      userId: user.id,
      cardId: cardId ?? null,
      teamId: resolvedTeamId,
    },
  })

  return NextResponse.json({
    id: session.id,
    title: session.title,
    messageCount: session.messageCount,
    lastMessageAt: session.lastMessageAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    cardId: session.cardId,
  })
}
