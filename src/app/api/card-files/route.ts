import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { hasProjectAccess } from '../../../lib/auth/github'
import { prisma } from '../../../lib/prisma'
import { worktreeExists, getChangedFiles, readWorktreeFile } from '../../../lib/git/worktree'
import { fetchRepoSpecTree } from '../../../lib/git/specTree'
import { isMockupPath } from '../../../lib/paths'

/**
 * GET /api/card-files?cardId=<identifier>
 *
 * Returns worktree files and project specs for a card. These involve slow
 * git subprocess calls and GitHub API requests, so they're loaded separately
 * from /api/card-detail to avoid blocking the initial card render.
 *
 * Looks up the card's project server-side rather than trusting client params.
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
  if (!cardId) {
    return NextResponse.json({ error: 'cardId param required' }, { status: 400 })
  }

  // Look up card's project server-side — don't trust client-provided owner/repo
  const card = await prisma.card.findUnique({
    where: { identifier: cardId },
    select: {
      team: {
        select: {
          project: {
            select: { owner: true, repoName: true, defaultBranch: true },
          },
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

  // Run worktree check and spec tree fetch in parallel
  const [hasWorktree, projectSpecs] = await Promise.all([
    worktreeExists(owner, repoName, cardId),
    (async (): Promise<{ filePath: string; content: string }[]> => {
      try {
        const specTree = await fetchRepoSpecTree(
          user.accessToken, owner, repoName, defaultBranch,
        )
        return specTree.files.map((f) => ({
          filePath: f.path,
          content: f.content,
        }))
      } catch {
        return []
      }
    })(),
  ])

  // Load worktree files if worktree exists
  const initialFiles: { filePath: string; isNew: boolean; content: string }[] = []
  let initialCodeFiles: { filePath: string; isNew: boolean }[] = []
  if (hasWorktree) {
    const { workhorseFiles, codeFiles } = await getChangedFiles(
      owner, repoName, cardId, defaultBranch,
    )
    const specFiles = workhorseFiles.filter((f) =>
      f.filePath.startsWith('.workhorse/specs/') ||
      isMockupPath(f.filePath),
    ).slice(0, 20)
    // Read files in batches of 5 to limit concurrent subprocesses
    for (let i = 0; i < specFiles.length; i += 5) {
      const batch = specFiles.slice(i, i + 5)
      const results = await Promise.all(
        batch.map(async (f) => {
          const content = await readWorktreeFile(
            owner, repoName, cardId, f.filePath,
          ) ?? ''
          return { ...f, content }
        }),
      )
      initialFiles.push(...results)
    }
    initialCodeFiles = codeFiles
  }

  return NextResponse.json({
    initialFiles,
    initialCodeFiles,
    projectSpecs,
  })
}
