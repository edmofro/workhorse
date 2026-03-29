import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { generateHandoffPrompt } from '../../../lib/handoff/generatePrompt'
import { safeParseTouchedFiles } from '../../../lib/safeParseTouchedFiles'

export async function GET(request: NextRequest) {
  const user = await requireUser()

  const cardId = request.nextUrl.searchParams.get('cardId')

  if (!cardId) {
    return new Response('Missing cardId', { status: 400 })
  }

  const card = await requireCardAccess(user.id, cardId)

  if (!card) {
    return new Response('Card not found', { status: 404 })
  }

  const touchedFiles = safeParseTouchedFiles(card.touchedFiles)

  const prompt = generateHandoffPrompt({
    cardIdentifier: card.identifier,
    cardTitle: card.title,
    branchName: card.cardBranch ?? 'unknown',
    baseBranch: card.team.project.defaultBranch,
    touchedFiles,
    status: card.status,
  })

  return NextResponse.json({ prompt })
}
