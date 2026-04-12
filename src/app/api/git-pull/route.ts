import { NextResponse } from 'next/server'
import { withCardAuth } from '../../../lib/auth/session'
import { pullBranch } from '../../../lib/git/worktree'

/**
 * POST /api/git-pull
 *
 * Pull remote changes into the card's worktree branch using rebase.
 * Fails if there are conflicts (conflict resolution is a future feature).
 */
export const POST = withCardAuth(async (user, card) => {
  const { owner, repoName } = card.team.project
  try {
    await pullBranch(owner, repoName, card.identifier, user.accessToken)
    return NextResponse.json({ pulled: true })
  } catch {
    return new Response('Pull failed', { status: 500 })
  }
})
