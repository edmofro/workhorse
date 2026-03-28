import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import {
  acquireFileLock,
  releaseFileLock,
  getFileLockStatus,
  getCardLocks,
} from '../../../lib/fileLock'

/**
 * File lock management API.
 * GET: Get lock status for a file or all locks for a card.
 * POST: Acquire a lock.
 * DELETE: Release a lock.
 */
export async function GET(request: NextRequest) {
  await requireUser()

  const cardId = request.nextUrl.searchParams.get('cardId')
  const filePath = request.nextUrl.searchParams.get('filePath')

  if (!cardId) {
    return new Response('Missing cardId', { status: 400 })
  }

  if (filePath) {
    const status = await getFileLockStatus(cardId, filePath)
    return NextResponse.json({ locked: !!status, holder: status })
  }

  const locks = await getCardLocks(cardId)
  return NextResponse.json({ locks })
}

export async function POST(request: NextRequest) {
  const user = await requireUser()

  const body = await request.json()
  const { cardId, filePath } = body as {
    cardId: string
    filePath: string
  }

  if (!cardId || !filePath) {
    return new Response('Missing cardId or filePath', { status: 400 })
  }

  const result = await acquireFileLock(cardId, filePath, user.id, user.id)

  if (!result.acquired) {
    return NextResponse.json(
      { acquired: false, holder: result.holder },
      { status: 409 },
    )
  }

  return NextResponse.json({ acquired: true })
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser()

  const cardId = request.nextUrl.searchParams.get('cardId')
  const filePath = request.nextUrl.searchParams.get('filePath')

  if (!cardId || !filePath) {
    return new Response('Missing cardId or filePath', { status: 400 })
  }

  await releaseFileLock(cardId, filePath, user.id)
  return NextResponse.json({ released: true })
}
