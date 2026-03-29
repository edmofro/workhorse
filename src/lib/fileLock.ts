/**
 * File locking — each spec/mockup file has at most one editor (user or AI) at a time.
 */

import { prisma } from './prisma'

const HUMAN_LOCK_DURATION_MS = 10 * 60 * 1000 // 10 minutes
const AI_LOCK_DURATION_MS = 2 * 60 * 1000     // 2 minutes
export const AI_LOCK_AGENT = 'ai-agent'
/** Pre-rename value — kept for transition so stale locks can be released. */
const AI_LOCK_AGENT_LEGACY = 'ai-interviewer'

function isAILock(lockedBy: string): boolean {
  return lockedBy === AI_LOCK_AGENT || lockedBy === AI_LOCK_AGENT_LEGACY
}

export type LockHolder = {
  lockedBy: string
  userId: string | null
  isAI: boolean
  displayName: string
}

/**
 * Attempt to acquire a lock on a file for a card.
 * Returns the lock if acquired, or null if the file is locked by someone else.
 */
export async function acquireFileLock(
  cardId: string,
  filePath: string,
  lockedBy: string,
  userId: string | null,
): Promise<{ acquired: boolean; holder?: LockHolder }> {
  const isAI = isAILock(lockedBy)
  const durationMs = isAI ? AI_LOCK_DURATION_MS : HUMAN_LOCK_DURATION_MS
  const expiresAt = new Date(Date.now() + durationMs)

  // Use a transaction to avoid TOCTOU race between check and create
  return prisma.$transaction(async (tx) => {
    // Check for existing lock
    const existing = await tx.fileLock.findUnique({
      where: { cardId_filePath: { cardId, filePath } },
      include: { user: true },
    })

    if (existing) {
      // Check if expired
      if (existing.expiresAt > new Date()) {
        // Lock is still active and held by someone else
        if (existing.lockedBy !== lockedBy) {
          return {
            acquired: false as const,
            holder: {
              lockedBy: existing.lockedBy,
              userId: existing.userId,
              isAI: isAILock(existing.lockedBy),
              displayName: isAILock(existing.lockedBy)
                ? 'Workhorse'
                : existing.user?.displayName ?? 'Unknown',
            },
          }
        }
        // Same holder — extend the lock
        await tx.fileLock.update({
          where: { id: existing.id },
          data: { expiresAt },
        })
        return { acquired: true as const }
      }
      // Lock is expired — delete and re-acquire
      await tx.fileLock.delete({ where: { id: existing.id } })
    }

    // Create new lock — catch unique constraint violation from concurrent requests
    try {
      await tx.fileLock.create({
        data: {
          cardId,
          filePath,
          lockedBy,
          userId,
          expiresAt,
        },
      })
      return { acquired: true as const }
    } catch (err) {
      // Unique constraint violation means another request won the race
      if (err instanceof Error && err.message.includes('Unique constraint')) {
        const winner = await tx.fileLock.findUnique({
          where: { cardId_filePath: { cardId, filePath } },
          include: { user: true },
        })
        return {
          acquired: false as const,
          holder: winner
            ? {
                lockedBy: winner.lockedBy,
                userId: winner.userId,
                isAI: isAILock(winner.lockedBy),
                displayName: isAILock(winner.lockedBy)
                  ? 'Workhorse'
                  : winner.user?.displayName ?? 'Unknown',
              }
            : undefined,
        }
      }
      throw err
    }
  })
}

/**
 * Release a file lock.
 */
export async function releaseFileLock(
  cardId: string,
  filePath: string,
  lockedBy: string,
): Promise<void> {
  await prisma.fileLock.deleteMany({
    where: { cardId, filePath, lockedBy },
  })
}

/**
 * Release all locks held by a specific entity for a card.
 * For AI locks, also releases any legacy 'ai-interviewer' locks from before the rename.
 */
export async function releaseAllLocks(
  cardId: string,
  lockedBy: string,
): Promise<void> {
  const values = isAILock(lockedBy)
    ? [AI_LOCK_AGENT, AI_LOCK_AGENT_LEGACY]
    : [lockedBy]
  await prisma.fileLock.deleteMany({
    where: { cardId, lockedBy: { in: values } },
  })
}

/**
 * Get the lock status for a file.
 */
export async function getFileLockStatus(
  cardId: string,
  filePath: string,
): Promise<LockHolder | null> {
  const lock = await prisma.fileLock.findUnique({
    where: { cardId_filePath: { cardId, filePath } },
    include: { user: true },
  })

  if (!lock || lock.expiresAt <= new Date()) {
    // Clean up expired lock
    if (lock) {
      await prisma.fileLock.delete({ where: { id: lock.id } }).catch(() => {})
    }
    return null
  }

  return {
    lockedBy: lock.lockedBy,
    userId: lock.userId,
    isAI: isAILock(lock.lockedBy),
    displayName: isAILock(lock.lockedBy)
      ? 'Workhorse'
      : lock.user?.displayName ?? 'Unknown',
  }
}

/**
 * Get all locks for a card.
 */
export async function getCardLocks(
  cardId: string,
): Promise<{ filePath: string; holder: LockHolder }[]> {
  const locks = await prisma.fileLock.findMany({
    where: { cardId },
    include: { user: true },
  })

  const now = new Date()
  const active: { filePath: string; holder: LockHolder }[] = []
  const expired: string[] = []

  for (const lock of locks) {
    if (lock.expiresAt <= now) {
      expired.push(lock.id)
      continue
    }
    active.push({
      filePath: lock.filePath,
      holder: {
        lockedBy: lock.lockedBy,
        userId: lock.userId,
        isAI: isAILock(lock.lockedBy),
        displayName: isAILock(lock.lockedBy)
          ? 'Workhorse'
          : lock.user?.displayName ?? 'Unknown',
      },
    })
  }

  // Clean up expired locks
  if (expired.length > 0) {
    await prisma.fileLock.deleteMany({
      where: { id: { in: expired } },
    }).catch(() => {})
  }

  return active
}

/**
 * Clean up all expired locks (periodic sweep).
 */
export async function cleanupExpiredLocks(): Promise<number> {
  const result = await prisma.fileLock.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  })
  return result.count
}
