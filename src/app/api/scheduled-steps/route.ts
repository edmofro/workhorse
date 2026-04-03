/**
 * POST /api/scheduled-steps — schedule a step
 * DELETE /api/scheduled-steps — unschedule a step
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'

export async function POST(request: NextRequest) {
  const user = await requireUser()
  const { cardId, skillId } = await request.json()

  if (!cardId || !skillId) {
    return NextResponse.json({ error: 'Missing cardId or skillId' }, { status: 400 })
  }

  await requireCardAccess(user.id, cardId)

  // Find the highest position for this card
  const last = await prisma.scheduledStep.findFirst({
    where: { cardId },
    orderBy: { position: 'desc' },
    select: { position: true },
  })

  const step = await prisma.scheduledStep.create({
    data: {
      cardId,
      skillId,
      position: (last?.position ?? -1) + 1,
    },
  })

  return NextResponse.json({
    id: step.id,
    skillId: step.skillId,
    position: step.position,
  })
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser()
  const { cardId, stepId } = await request.json()

  if (!cardId || !stepId) {
    return NextResponse.json({ error: 'Missing cardId or stepId' }, { status: 400 })
  }

  await requireCardAccess(user.id, cardId)

  await prisma.scheduledStep.delete({
    where: { id: stepId },
  }).catch(() => {
    // Already deleted, ignore
  })

  return NextResponse.json({ ok: true })
}
