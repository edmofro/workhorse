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
      specs: true,
      mockups: true,
      team: { include: { project: true } },
    },
  })

  if (!card) {
    return new Response('Card not found', { status: 404 })
  }

  const mockupPaths = card.mockups.map(
    (m) => `.workhorse/design/mockups/${m.title.toLowerCase().replace(/\s+/g, '-')}.html`,
  )

  const prompt = generateHandoffPrompt({
    cardIdentifier: card.identifier,
    cardTitle: card.title,
    branchName: card.specBranch ?? 'unknown',
    baseBranch: card.team.project.defaultBranch,
    specs: card.specs.map((s) => ({
      filePath: s.filePath,
      isNew: s.isNew,
    })),
    mockupPaths,
  })

  return NextResponse.json({ prompt })
}
