'use server'

import { prisma } from '../prisma'
import { requireUser } from '../auth/session'
import { revalidatePath } from 'next/cache'

/** Associate uploaded attachments with a card (description-level) */
export async function associateAttachmentsWithCard(
  cardId: string,
  attachmentIds: string[],
) {
  await requireUser()
  if (attachmentIds.length === 0) return

  await prisma.attachment.updateMany({
    where: { id: { in: attachmentIds } },
    data: { cardId },
  })
  revalidatePath('/')
}

/** Associate uploaded attachments with a comment */
export async function associateAttachmentsWithComment(
  commentId: string,
  cardId: string,
  attachmentIds: string[],
) {
  await requireUser()
  if (attachmentIds.length === 0) return

  await prisma.attachment.updateMany({
    where: { id: { in: attachmentIds } },
    data: { commentId, cardId },
  })
  revalidatePath('/')
}

/** Get attachments for a card (description-level, not on comments) */
export async function getCardAttachments(cardId: string) {
  return prisma.attachment.findMany({
    where: { cardId, commentId: null },
    orderBy: { createdAt: 'asc' },
  })
}

/** Get attachments for a comment */
export async function getCommentAttachments(commentId: string) {
  return prisma.attachment.findMany({
    where: { commentId },
    orderBy: { createdAt: 'asc' },
  })
}
