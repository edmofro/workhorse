import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { getFileDiffFromBase } from '../../../lib/git/worktree'

/**
 * Returns the unified diff for a code file on the card's branch vs the base branch.
 */
export async function GET(request: NextRequest) {
  const user = await requireUser()

  const cardId = request.nextUrl.searchParams.get('cardId')
  const filePath = request.nextUrl.searchParams.get('filePath')

  if (!cardId || !filePath) {
    return NextResponse.json({ error: 'Missing cardId or filePath' }, { status: 400 })
  }

  const card = await requireCardAccess(user.id, cardId)
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  const { owner, repoName, defaultBranch } = card.team.project

  const diff = await getFileDiffFromBase(
    owner, repoName, card.identifier, defaultBranch, filePath,
  )

  if (diff === null) {
    return NextResponse.json({ error: 'Failed to compute diff' }, { status: 500 })
  }

  return NextResponse.json({ diff })
}
