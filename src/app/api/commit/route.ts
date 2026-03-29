import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { commitCardChanges } from '../../../lib/git/commitSpecs'

/**
 * Manual commit trigger — commits any uncommitted worktree changes.
 * In the new architecture, this is rarely needed since auto-commit handles most cases.
 */
export async function POST(request: NextRequest) {
  const user = await requireUser()

  const body = await request.json()
  const { cardId, commitMessage } = body as { cardId: string; commitMessage?: string }

  if (!cardId) {
    return new Response('Missing cardId', { status: 400 })
  }

  try {
    const changedFiles = await commitCardChanges(
      cardId,
      commitMessage ?? 'Manual spec update',
      user.displayName,
      `${user.githubUsername}@users.noreply.github.com`,
      user.accessToken,
    )

    return NextResponse.json({ changedFiles })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Commit failed'
    return new Response(message, { status: 500 })
  }
}
