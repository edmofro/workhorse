import { NextResponse } from 'next/server'
import { withCardAuth } from '../../../lib/auth/session'
import { pushBranch } from '../../../lib/git/worktree'

/**
 * POST /api/git-push
 *
 * Push the card's worktree branch to the remote.
 */
export const POST = withCardAuth(async (user, card) => {
  const { owner, repoName } = card.team.project
  try {
    await pushBranch(owner, repoName, card.identifier, user.accessToken)
    return NextResponse.json({ pushed: true })
  } catch {
    return new Response('Push failed', { status: 500 })
  }
})
