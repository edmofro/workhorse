import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { commitFeatureSpecs } from '../../../lib/git/commitSpecs'

export async function POST(request: NextRequest) {
  const user = await requireUser()

  const body = await request.json()
  const { featureId } = body as { featureId: string }

  if (!featureId) {
    return new Response('Missing featureId', { status: 400 })
  }

  try {
    const result = await commitFeatureSpecs(user.accessToken, featureId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Commit failed'
    return new Response(message, { status: 500 })
  }
}
