import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { hasProjectAccess } from '../../../lib/auth/github'
import { pullBranch } from '../../../lib/git/worktree'

/**
 * POST /api/git-pull
 *
 * Pull remote changes into the card's worktree branch using rebase.
 * Fails if there are conflicts (conflict resolution is a future feature).
 */
export async function POST(request: NextRequest) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

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

  if (!await hasProjectAccess(user.accessToken, owner, repoName)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await pullBranch(owner, repoName, card.identifier, user.accessToken)
    return NextResponse.json({ pulled: true })
  } catch {
    return new Response('Pull failed', { status: 500 })
  }
}
