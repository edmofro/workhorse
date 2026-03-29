import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { prisma } from '../../../lib/prisma'
import {
  createBareClone,
  fetchBareClone,
  createWorktree,
} from '../../../lib/git/worktree'
import { branchNameFromCard } from '../../../lib/git/branchNaming'

/**
 * Ensure a card's worktree exists, creating it if needed.
 * Called when a user wants to create/edit specs without starting an interview.
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

  const { owner, repoName, defaultBranch } = card.team.project

  // Ensure bare clone exists and is fresh
  await createBareClone(owner, repoName, user.accessToken)
  await fetchBareClone(owner, repoName, user.accessToken)

  // Ensure worktree exists
  const branchName = card.cardBranch ?? branchNameFromCard(card.identifier)
  await createWorktree(owner, repoName, card.identifier, branchName, defaultBranch)

  // Update card branch if not set
  if (!card.cardBranch) {
    await prisma.card.update({
      where: { id: cardId },
      data: { cardBranch: branchName },
    })
  }

  return NextResponse.json({ ok: true })
}
