import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { prisma } from '../../../lib/prisma'

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
  const limit = parseInt(searchParams.get('limit') ?? '8', 10)

  if (recent === 'true') {
    const sessions = await prisma.conversationSession.findMany({
      where: { userId: user.id },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      include: {
        card: {
          select: {
            identifier: true,
            title: true,
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

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        messageCount: s.messageCount,
        lastMessageAt: s.lastMessageAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        cardId: s.cardId,
        cardIdentifier: s.card?.identifier ?? null,
        cardTitle: s.card?.title ?? null,
        teamColour: s.card?.team?.colour ?? s.team?.colour ?? null,
        projectName: s.card?.team?.project?.name ?? s.team?.project?.name ?? null,
      })),
    })
  }

  if (cardId) {
    const sessions = await prisma.conversationSession.findMany({
      where: { cardId },
      orderBy: { lastMessageAt: 'desc' },
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

  // If cardId provided, resolve teamId from the card
  let resolvedTeamId = teamId ?? null
  if (cardId && !resolvedTeamId) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { teamId: true },
    })
    resolvedTeamId = card?.teamId ?? null
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
