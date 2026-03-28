import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { commitCardSpecs } from '../../../lib/git/commitSpecs'

export async function POST(request: NextRequest) {
  const user = await requireUser()

  const body = await request.json()
  const { cardId } = body as { cardId: string }

  if (!cardId) {
    return new Response('Missing cardId', { status: 400 })
  }

  try {
    const result = await commitCardSpecs(user.accessToken, cardId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Commit failed'
    return new Response(message, { status: 500 })
  }
}
