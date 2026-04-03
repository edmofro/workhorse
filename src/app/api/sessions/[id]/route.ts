import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/auth/session'
import { prisma } from '../../../../lib/prisma'

/**
 * PATCH /api/sessions/[id]
 *
 * Update a session. Supports { dismissedFromRecent: true } to hide it from the recent list.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser()
  const { id } = await params
  const body = await request.json()

  const session = await prisma.conversationSession.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updateData: { dismissedFromRecent?: boolean } = {}
  if (typeof body.dismissedFromRecent === 'boolean') {
    updateData.dismissedFromRecent = body.dismissedFromRecent
  }

  const updated = await prisma.conversationSession.update({
    where: { id },
    data: updateData,
    select: { id: true, dismissedFromRecent: true },
  })

  return NextResponse.json(updated)
}
