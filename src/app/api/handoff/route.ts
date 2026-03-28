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

  const prompt = generateHandoffPrompt({
    featureIdentifier: feature.identifier,
    featureTitle: feature.title,
    branchName: feature.specBranch ?? 'unknown',
    specs: feature.specs.map((s) => ({
      filePath: s.filePath,
      content: s.content,
      isNew: s.isNew,
    })),
    mockups: feature.mockups.map((m) => ({
      title: m.title,
      html: m.html,
    })),
    productName: feature.team.product.name,
    repoOwner: feature.team.product.owner,
    repoName: feature.team.product.repoName,
  })

  return new NextResponse(prompt, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${feature.identifier}-handoff.md"`,
    },
  })
}
