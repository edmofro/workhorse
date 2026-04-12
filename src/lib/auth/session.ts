/**
 * Session management via httpOnly cookies.
 *
 * Stores the authenticated user's ID in a signed cookie.
 * All session checks go through getCurrentUser() which hits the DB.
 */

import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../prisma'
import { hasProjectAccess } from './github'

const SESSION_COOKIE = 'sessionUserId'
const SESSION_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

export async function setSessionUserId(userId: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value ?? null
}

export async function getCurrentUser() {
  const userId = await getSessionUserId()
  if (!userId) return null

  return prisma.user.findUnique({ where: { id: userId } })
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  return user
}

/**
 * Fetch the card and verify it exists.
 * Returns the card (with team.project included) if found.
 */
export async function requireCardAccess(
  userId: string,
  cardId: string,
) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { team: { include: { project: true } } },
  })

  if (!card) return null

  return card
}

type CardAuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
type CardAuthCard = NonNullable<Awaited<ReturnType<typeof requireCardAccess>>>

/**
 * Shared boilerplate for POST routes that act on a card.
 * Handles auth (401), body parsing (400), card lookup (404), and project access (403).
 */
export function withCardAuth(
  handler: (user: CardAuthUser, card: CardAuthCard) => Promise<Response>,
) {
  return async (request: NextRequest): Promise<Response> => {
    let user: CardAuthUser
    try {
      user = await requireUser()
    } catch {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    let cardId: string
    try {
      const body = await request.json()
      cardId = body?.cardId
    } catch {
      return new Response('Invalid request body', { status: 400 })
    }

    if (!cardId) {
      return new Response('Missing cardId', { status: 400 })
    }

    const card = await requireCardAccess(user.id, cardId)
    if (!card) {
      return new Response('Card not found', { status: 404 })
    }

    const { owner, repoName } = card.team.project
    if (!await hasProjectAccess(user.accessToken, owner, repoName)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return handler(user, card)
  }
}
