/**
 * Session management via httpOnly cookies.
 *
 * Stores the authenticated user's ID in a signed cookie.
 * All session checks go through getCurrentUser() which hits the DB.
 */

import { cookies } from 'next/headers'
import { prisma } from '../prisma'

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
