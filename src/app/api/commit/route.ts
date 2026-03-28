import { NextRequest, NextResponse } from 'next/server'
import { commitFeatureSpecs } from '../../../lib/git/commitSpecs'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { featureId } = body as { featureId: string }

  if (!featureId) {
    return new Response('Missing featureId', { status: 400 })
  }

  try {
    const result = await commitFeatureSpecs(featureId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Commit failed'
    return new Response(message, { status: 500 })
  }
}
