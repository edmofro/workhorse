'use server'

import { prisma } from '../prisma'
import { requireUser } from '../auth/session'
import { revalidatePath } from 'next/cache'

/**
 * Verify the current user owns all the given attachments.
 * Returns true only if every attachment exists and was uploaded by this user.
 */
async function verifyAttachmentOwnership(userId: string, attachmentIds: string[]): Promise<boolean> {
  const count = await prisma.attachment.count({
    where: { id: { in: attachmentIds }, uploadedById: userId },
  })
  return count === attachmentIds.length
}

/** Associate uploaded attachments with a card (description-level) */
export async function associateAttachmentsWithCard(
  cardId: string,
  attachmentIds: string[],
) {
  const user = await requireUser()
  if (attachmentIds.length === 0) return

  // Verify the user owns these attachments
  if (!(await verifyAttachmentOwnership(user.id, attachmentIds))) {
    throw new Error('Unauthorised: cannot associate attachments you did not upload')
  }

  await prisma.attachment.updateMany({
    where: { id: { in: attachmentIds }, uploadedById: user.id },
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
  const user = await requireUser()
  if (attachmentIds.length === 0) return

  // Verify the user owns these attachments
  if (!(await verifyAttachmentOwnership(user.id, attachmentIds))) {
    throw new Error('Unauthorised: cannot associate attachments you did not upload')
  }

  await prisma.attachment.updateMany({
    where: { id: { in: attachmentIds }, uploadedById: user.id },
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
