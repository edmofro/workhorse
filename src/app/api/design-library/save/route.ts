import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../../lib/auth/session'
import { createOrUpdateFile, getFileContent } from '../../../../lib/git/githubClient'

/**
 * Save a design file directly to the default branch.
 * Unlike spec edits (which go through card worktrees), design library edits
 * commit straight to main since they don't follow the card workflow.
 */
export async function POST(request: NextRequest) {
  const user = await requireUser()

  const { owner, repo, branch, path, content, message } = (await request.json()) as {
    owner: string
    repo: string
    branch: string
    path: string
    content: string
    message?: string
  }

  if (!owner || !repo || !path || content === undefined) {
    return new Response('Missing required fields', { status: 400 })
  }

  const targetBranch = branch || 'main'
  const commitMessage = message || `Update ${path.replace('.workhorse/design/', '')}`

  try {
    // Get existing file SHA for update (null if new file)
    const existing = await getFileContent(user.accessToken, owner, repo, path, targetBranch)
    const existingSha = existing?.sha as string | undefined

    await createOrUpdateFile(
      user.accessToken,
      owner,
      repo,
      path,
      content,
      commitMessage,
      targetBranch,
      existingSha,
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Failed to save design file'
    return new Response(errMessage, { status: 500 })
  }
}
