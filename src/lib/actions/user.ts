'use server'

import { prisma } from '../prisma'
import { cookies } from 'next/headers'

export async function createUser(displayName: string) {
  const user = await prisma.user.create({
    data: { displayName },
  })

  const cookieStore = await cookies()
  cookieStore.set('userId', user.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })

  return user
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  if (!userId) return null

  return prisma.user.findUnique({ where: { id: userId } })
}

export async function updateUser(id: string, displayName: string) {
  return prisma.user.update({
    where: { id },
    data: { displayName },
  })
}

export async function getUserId() {
  const cookieStore = await cookies()
  return cookieStore.get('userId')?.value ?? null
}
