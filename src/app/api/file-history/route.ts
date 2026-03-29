import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { getFileHistory, getFileAtCommit, getFileDiff } from '../../../lib/git/worktree'

/**
 * Per-file version history powered by git log.
 */
export async function GET(request: NextRequest) {
  const user = await requireUser()

  const cardId = request.nextUrl.searchParams.get('cardId')
  const filePath = request.nextUrl.searchParams.get('filePath')
  const sha = request.nextUrl.searchParams.get('sha')
  const diffFrom = request.nextUrl.searchParams.get('diffFrom')
  const diffTo = request.nextUrl.searchParams.get('diffTo')

  if (!cardId) {
    return new Response('Missing cardId', { status: 400 })
  }

  const card = await requireCardAccess(user.id, cardId)

  if (!card) {
    return new Response('Card not found', { status: 404 })
  }

  const { owner, repoName } = card.team.project

  // Get file content at a specific commit
  if (sha && filePath) {
    const content = await getFileAtCommit(
      owner, repoName, card.identifier, sha, filePath,
    )
    return NextResponse.json({ content })
  }

  // Get diff between two commits
  if (diffFrom && diffTo && filePath) {
    const diff = await getFileDiff(
      owner, repoName, card.identifier, diffFrom, diffTo, filePath,
    )
    return NextResponse.json({ diff })
  }

  // Get file history
  if (filePath) {
    const history = await getFileHistory(
      owner, repoName, card.identifier, filePath,
    )
    return NextResponse.json({ history })
  }

  return new Response('Missing filePath', { status: 400 })
}
