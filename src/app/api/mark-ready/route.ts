import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { prisma } from '../../../lib/prisma'

/**
 * Mark a card as ready for implementation.
 * Transitions SPECIFYING → IMPLEMENTING.
 */
export async function POST(request: NextRequest) {
  const user = await requireUser()

  const body = await request.json()
  const { cardId } = body as { cardId: string }

  if (!cardId) {
    return new Response('Missing cardId', { status: 400 })
  }

  const card = await requireCardAccess(user.id, cardId)

  if (!card) {
    return new Response('Card not found', { status: 404 })
  }

  if (card.status !== 'SPECIFYING') {
    return new Response(
      `Cannot mark ready: card is ${card.status}, expected SPECIFYING`,
      { status: 400 },
    )
  }

  await prisma.card.update({
    where: { id: cardId },
    data: { status: 'IMPLEMENTING' },
  })

  await prisma.cardActivity.create({
    data: {
      cardId,
      userId: user.id,
      action: 'marked_ready',
      details: JSON.stringify({
        from: 'SPECIFYING',
        to: 'IMPLEMENTING',
      }),
    },
  })

  return NextResponse.json({ status: 'IMPLEMENTING' })
}
