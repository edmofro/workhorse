import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { generateHandoffPrompt } from '../../../lib/handoff/generatePrompt'

export async function GET(request: NextRequest) {
  const featureId = request.nextUrl.searchParams.get('featureId')

  if (!featureId) {
    return new Response('Missing featureId', { status: 400 })
  }

  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: {
      specs: true,
      mockups: true,
      team: { include: { product: true } },
    },
  })

  if (!feature) {
    return new Response('Feature not found', { status: 404 })
  }

  const mockupPaths = feature.mockups.map(
    (m) => `.workhorse/design/mockups/${m.title.toLowerCase().replace(/\s+/g, '-')}.html`,
  )

  const prompt = generateHandoffPrompt({
    featureIdentifier: feature.identifier,
    featureTitle: feature.title,
    branchName: feature.specBranch ?? 'unknown',
    baseBranch: feature.team.product.defaultBranch,
    specs: feature.specs.map((s) => ({
      filePath: s.filePath,
      isNew: s.isNew,
    })),
    mockupPaths,
  })

  return NextResponse.json({ prompt })
}
