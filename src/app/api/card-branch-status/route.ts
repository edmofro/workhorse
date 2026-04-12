import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { hasProjectAccess } from '../../../lib/auth/github'
import { prisma } from '../../../lib/prisma'
import { getBranchStatus, getUpstreamBehindCount, worktreeExists } from '../../../lib/git/worktree'
import { getCheckStatus, getPullRequest } from '../../../lib/git/githubClient'

/**
 * GET /api/card-branch-status?cardId=<identifier>
 *
 * Lightweight endpoint for polling PR + branch status.
 * Returns: PR state (open/merged/title), CI checks, branch sync status,
 * upstream behind count. Designed for 15s polling intervals.
 */
export async function GET(request: NextRequest) {
  let user
  try {
    user = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const cardId = searchParams.get('cardId')
  if (!cardId || !/^[A-Z]+-\d{1,6}$/.test(cardId)) {
    return NextResponse.json({ error: 'cardId param required' }, { status: 400 })
  }

  const card = await prisma.card.findUnique({
    where: { identifier: cardId },
    select: {
      id: true,
      cardBranch: true,
      prNumber: true,
      prUrl: true,
      dependsOn: {
        include: { parent: { select: { identifier: true, cardBranch: true } } },
      },
      team: {
        select: {
          project: { select: { owner: true, repoName: true, defaultBranch: true } },
        },
      },
    },
  })

  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  const { owner, repoName, defaultBranch } = card.team.project

  if (!await hasProjectAccess(user.accessToken, owner, repoName)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Run all status checks in parallel — worktreeExists runs alongside GitHub API calls
  const worktreeCheck = card.cardBranch
    ? worktreeExists(owner, repoName, cardId)
    : Promise.resolve(false)

  const [hasWorktree, pr, ciStatus] = await Promise.all([
    worktreeCheck,

    // PR status from GitHub (only if PR exists)
    card.prNumber
      ? getPullRequest(user.accessToken, owner, repoName, card.prNumber)
      : Promise.resolve(null),

    // CI status (only if branch exists)
    card.cardBranch
      ? getCheckStatus(user.accessToken, owner, repoName, card.cardBranch)
      : Promise.resolve({ status: null, total: 0 }),
  ])

  // Git-based queries depend on worktree existing
  const [branchStatus, upstreamBehind] = hasWorktree
    ? await Promise.all([
        getBranchStatus(owner, repoName, cardId, defaultBranch),
        (() => {
          const parentBranch = card.dependsOn[0]?.parent.cardBranch
          const upstreamRef = parentBranch ?? defaultBranch
          return getUpstreamBehindCount(owner, repoName, cardId, upstreamRef)
        })(),
      ])
    : [{ localChanges: 0, unpushedCommits: 0, remoteAhead: 0 }, 0]

  return NextResponse.json({
    // PR state
    pr: pr
      ? {
          state: pr.state,
          merged: pr.merged,
          title: pr.title,
          mergedAt: pr.mergedAt,
        }
      : null,
    prUrl: card.prUrl,
    prNumber: card.prNumber,

    // CI
    ci: ciStatus,

    // Branch sync
    branch: {
      name: card.cardBranch,
      localChanges: branchStatus.localChanges,
      unpushedCommits: branchStatus.unpushedCommits,
      remoteAhead: branchStatus.remoteAhead,
    },

    // Upstream
    upstreamBehind,
  })
}
