/**
 * POST /api/scheduled-steps — schedule a step
 * DELETE /api/scheduled-steps — unschedule a step
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { isValidSkillId } from '../../../lib/skills/registry'

export async function POST(request: NextRequest) {
  const user = await requireUser()
  const { cardId, skillId } = await request.json()

  if (!cardId || !skillId) {
    return NextResponse.json({ error: 'Missing cardId or skillId' }, { status: 400 })
  }

  // Validate skillId against the registry to prevent arbitrary strings in DB
  if (!isValidSkillId(skillId)) {
    return NextResponse.json({ error: 'Invalid skillId' }, { status: 400 })
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

  if (!cardId || !stepId || typeof cardId !== 'string' || typeof stepId !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid cardId or stepId' }, { status: 400 })
  }

  await requireCardAccess(user.id, cardId)

  // Use compound where to ensure step belongs to the specified card
  await prisma.scheduledStep.deleteMany({
    where: { id: stepId, cardId },
  })

  return NextResponse.json({ ok: true })
}
