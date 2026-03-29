'use server'

/**
 * Spec file operations — now backed by worktree files instead of DB models.
 * These actions are kept for backward compatibility during the transition.
 */

import { readWorktreeFile, writeWorktreeFile, getChangedFiles } from '../git/worktree'
import { prisma } from '../prisma'

export async function getSpecFiles(cardId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { team: { include: { project: true } } },
  })

  if (!card) return []

  const { owner, repoName, defaultBranch } = card.team.project

  const files = await getChangedFiles(owner, repoName, card.identifier, defaultBranch)
  return files
    .filter((f) => f.filePath.startsWith('.workhorse/specs/'))
    .map((f) => ({
      filePath: f.filePath,
      isNew: f.isNew,
    }))
}

export async function readSpecFile(cardId: string, filePath: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { team: { include: { project: true } } },
  })

  if (!card) return null

  const { owner, repoName } = card.team.project
  return readWorktreeFile(owner, repoName, card.identifier, filePath)
}

export async function writeSpecFile(cardId: string, filePath: string, content: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { team: { include: { project: true } } },
  })

  if (!card) throw new Error('Card not found')

  const { owner, repoName } = card.team.project
  await writeWorktreeFile(owner, repoName, card.identifier, filePath, content)
}
