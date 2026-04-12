import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { pushBranch } from '../../../lib/git/worktree'

/**
 * POST /api/git-push
 *
 * Push the card's worktree branch to the remote.
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

  const { owner, repoName } = card.team.project

  try {
    await pushBranch(owner, repoName, card.identifier, user.accessToken)
    return NextResponse.json({ pushed: true })
  } catch {
    return new Response('Push failed', { status: 500 })
  }
}
