import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { getBaseFileContent } from '../../../lib/git/worktree'

/**
 * Returns the content of a file from the base branch (before card changes).
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

  const content = await getBaseFileContent(
    owner, repoName, card.identifier, defaultBranch, filePath,
  )

  // null means file doesn't exist on base branch (it's entirely new)
  return NextResponse.json({ content })
}
