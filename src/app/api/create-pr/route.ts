import { NextRequest, NextResponse } from 'next/server'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { prisma } from '../../../lib/prisma'
import { createPullRequest } from '../../../lib/git/githubClient'
import { autoCommit, getChangedFiles } from '../../../lib/git/worktree'

/**
 * POST /api/create-pr
 * Creates a GitHub pull request for a card's branch.
 * Pushes any uncommitted changes first, then creates the PR.
 */
export async function POST(request: NextRequest) {
  const user = await requireUser()

  const body = await request.json()
  const { cardId } = body as { cardId: string }

  if (!cardId) {
    return NextResponse.json({ error: 'Missing cardId' }, { status: 400 })
  }

  const card = await requireCardAccess(user.id, cardId)
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  if (card.prUrl) {
    return NextResponse.json({ error: 'PR already exists', prUrl: card.prUrl }, { status: 409 })
  }

  if (!card.cardBranch) {
    return NextResponse.json({ error: 'No branch exists for this card' }, { status: 400 })
  }

  const { owner, repoName, defaultBranch } = card.team.project

  // Push any uncommitted worktree changes before creating the PR
  try {
    await autoCommit(
      owner,
      repoName,
      card.identifier,
      'Pre-PR commit',
      user.displayName,
      `${user.githubUsername}@users.noreply.github.com`,
      user.accessToken,
    )
  } catch {
    // No worktree or nothing to commit — that's fine, branch should already be pushed
  }

  // Build PR title and body from card context (derive file lists from git)
  const { workhorseFiles, codeFiles: changedCodeFiles } = await getChangedFiles(
    owner, repoName, card.identifier, defaultBranch,
  )
  const specFiles = workhorseFiles
    .filter(f => f.filePath.startsWith('.workhorse/specs/'))
    .map(f => f.filePath)
  const codeFiles = changedCodeFiles.map(f => f.filePath)

  const journalEntries = await prisma.journalEntry.findMany({
    where: { cardId },
    orderBy: { createdAt: 'asc' },
    select: { type: true, summary: true },
    take: 50,
  })

  const title = `${card.identifier}: ${card.title}`

  const bodyParts: string[] = []
  bodyParts.push('## Summary\n')
  if (card.description) {
    bodyParts.push(card.description)
  } else {
    bodyParts.push(`Implementation for ${card.title}.`)
  }

  if (journalEntries.length > 0) {
    bodyParts.push('\n### Journey\n')
    for (const entry of journalEntries) {
      bodyParts.push(`- ${entry.summary}`)
    }
  }

  if (specFiles.length > 0) {
    bodyParts.push(`\n### Specs\n`)
    for (const f of specFiles) {
      bodyParts.push(`- \`${f}\``)
    }
  }

  if (codeFiles.length > 0) {
    bodyParts.push(`\n### Changed files\n`)
    for (const f of codeFiles) {
      bodyParts.push(`- \`${f}\``)
    }
  }

  bodyParts.push('\n## Test plan\n')
  bodyParts.push('<!-- How was this tested? -->')
  bodyParts.push('\n### Review Hero\n')
  bodyParts.push('- [ ] **Run Review Hero** <!-- #ai-review -->')
  bodyParts.push('- [ ] **Auto-fix review suggestions** <!-- #auto-fix -->')
  bodyParts.push('- [ ] **Auto-fix CI failures** <!-- #auto-fix-ci -->')

  const prBody = bodyParts.join('\n')

  try {
    const pr = await createPullRequest(
      user.accessToken,
      owner,
      repoName,
      title,
      prBody,
      card.cardBranch,
      defaultBranch,
    )

    // Store PR info on the card
    await prisma.card.update({
      where: { id: cardId },
      data: {
        prUrl: pr.html_url,
        prNumber: pr.number,
        lastActivityAt: new Date(),
      },
    })

    // Record activity
    await prisma.cardActivity.create({
      data: {
        cardId,
        userId: user.id,
        action: 'pr_created',
        details: JSON.stringify({ prUrl: pr.html_url, prNumber: pr.number }),
      },
    })

    return NextResponse.json({ prUrl: pr.html_url, prNumber: pr.number })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create PR'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
