import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { prisma } from '../../../lib/prisma'
import { autoCommit } from '../../../lib/git/worktree'

/**
 * Auto-commit changed files in a card's worktree.
 * Called when a user leaves edit mode.
 */
export async function POST(request: NextRequest) {
  const user = await requireUser()

  const body = await request.json()
  const { cardId, commitMessage } = body as {
    cardId: string
    commitMessage?: string
  }

  if (!cardId) {
    return new Response('Missing cardId', { status: 400 })
  }

  const card = await requireCardAccess(user.id, cardId)

  if (!card) {
    return new Response('Card not found', { status: 404 })
  }

  const { owner, repoName } = card.team.project

  try {
    const message = commitMessage || 'Update specs'
    const changedFiles = await autoCommit(
      owner,
      repoName,
      card.identifier,
      message,
      user.displayName,
      `${user.githubUsername}@users.noreply.github.com`,
      user.accessToken,
    )

    if (changedFiles.length > 0) {
      await prisma.card.update({
        where: { id: cardId },
        data: { lastActivityAt: new Date() },
      })

      // Record activity
      await prisma.cardActivity.create({
        data: {
          cardId,
          userId: user.id,
          action: 'spec_updated',
          details: JSON.stringify({ files: changedFiles, message }),
        },
      })
    }

    return NextResponse.json({ changedFiles })
  } catch {
    return new Response('Auto-commit failed', { status: 500 })
  }
}
