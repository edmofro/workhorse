/**
 * Auto-commit spec changes from a card's worktree.
 * The old GitHub API-based commit flow is replaced with local git operations.
 *
 * Changes are committed and pushed directly from the worktree.
 * The branch is the source of truth — no manual "commit" action needed.
 */

import { autoCommit } from './worktree'
import { prisma } from '../prisma'

export async function commitCardChanges(
  cardId: string,
  commitMessage: string,
  authorName: string,
  authorEmail: string,
  token: string,
): Promise<string[]> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      team: { include: { project: true } },
    },
  })

  if (!card) throw new Error('Card not found')

  const { owner, repoName } = card.team.project

  const changedFiles = await autoCommit(
    owner,
    repoName,
    card.identifier,
    commitMessage,
    authorName,
    authorEmail,
    token,
  )

  if (changedFiles.length > 0) {
    await prisma.card.update({
      where: { id: cardId },
      data: { lastActivityAt: new Date() },
    })
  }

  return changedFiles
}
