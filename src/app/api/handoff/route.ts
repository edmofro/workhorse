import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireUser } from '../../../lib/auth/session'
import { generateHandoffPrompt } from '../../../lib/handoff/generatePrompt'

export async function GET(request: NextRequest) {
  await requireUser()

  const cardId = request.nextUrl.searchParams.get('cardId')

  if (!cardId) {
    return new Response('Missing cardId', { status: 400 })
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      team: { include: { project: true } },
    },
  })

  if (!card) {
    return new Response('Card not found', { status: 404 })
  }

  const touchedFiles: string[] = JSON.parse(card.touchedFiles)

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
