'use server'

import { prisma } from '../prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser, getSessionUserId } from '../auth/session'

export { getCurrentUser, getSessionUserId as getUserId }

export async function updateUser(id: string, displayName: string) {
  const user = await prisma.user.update({
    where: { id },
    data: { displayName },
  })
  revalidatePath('/')
  return user
}
