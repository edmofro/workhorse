import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../../lib/auth/session'
import { prisma } from '../../../../../lib/prisma'
import { cancelAgent } from '../../../../../lib/agentLifecycle'

/**
 * POST /api/sessions/[id]/cancel
 *
 * Cancel a running agent session. Aborts the Agent SDK query
 * so it stops consuming API credits and making file changes.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { id: sessionId } = await params

  // Verify ownership
  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  })

  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const cancelled = cancelAgent(sessionId)
  return NextResponse.json({ cancelled })
}
