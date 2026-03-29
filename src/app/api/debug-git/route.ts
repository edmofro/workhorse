import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { bareClonePath } from '../../../lib/git/worktree'
import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'

const execFileAsync = promisify(execFile)

async function run(cmd: string, args: string[], cwd: string): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, { cwd, timeout: 10_000 })
    return stdout.trim() + (stderr ? `\n[stderr] ${stderr.trim()}` : '')
  } catch (err) {
    return `[error] ${err instanceof Error ? err.message : String(err)}`
  }
}

export async function GET(request: NextRequest) {
  await requireUser()

  const owner = request.nextUrl.searchParams.get('owner')
  const repo = request.nextUrl.searchParams.get('repo')
  const branch = request.nextUrl.searchParams.get('branch') ?? 'main'

  if (!owner || !repo) {
    return new Response('Missing owner or repo', { status: 400 })
  }

  const barePath = bareClonePath(owner, repo)
  const diag: Record<string, unknown> = { barePath, owner, repo, branch }

  // Check if directory exists
  try {
    const stat = await fs.stat(barePath)
    diag.bareCloneExists = true
    diag.isDirectory = stat.isDirectory()
  } catch (err) {
    diag.bareCloneExists = false
    diag.accessError = err instanceof Error ? err.message : String(err)
  }

  if (diag.bareCloneExists) {
    // List directory contents
    try {
      const entries = await fs.readdir(barePath)
      diag.dirContents = entries
    } catch (err) {
      diag.dirContents = `[error] ${err instanceof Error ? err.message : String(err)}`
    }

    // Check if it's a valid git repo
    diag.revParseGitDir = await run('git', ['rev-parse', '--git-dir'], barePath)
    diag.isBare = await run('git', ['rev-parse', '--is-bare-repository'], barePath)

    // List all refs
    diag.refs = await run('git', ['for-each-ref', '--format=%(refname) %(objectname:short)', 'refs/heads/'], barePath)

    // Check the specific branch
    diag.branchRevParse = await run('git', ['rev-parse', '--verify', `refs/heads/${branch}`], barePath)

    // Try ls-tree for specs
    diag.specsLsTree = await run('git', ['ls-tree', '-r', '--name-only', `refs/heads/${branch}`, '--', '.workhorse/specs/'], barePath)

    // Try ls-tree for design
    diag.designLsTree = await run('git', ['ls-tree', '-r', '--name-only', `refs/heads/${branch}`, '--', '.workhorse/design/'], barePath)

    // Check remote URL (redact token)
    const remoteUrl = await run('git', ['remote', 'get-url', 'origin'], barePath)
    diag.remoteUrl = remoteUrl.replace(/x-access-token:[^@]+@/, 'x-access-token:***@')

    // Check remote config (fetch refspec)
    diag.fetchRefspec = await run('git', ['config', '--get', 'remote.origin.fetch'], barePath)
  }

  // Check parent directories
  const reposBase = process.env.REPOS_BASE_PATH ?? '/data/repos'
  try {
    const entries = await fs.readdir(`${reposBase}/${owner}/${repo}`)
    diag.repoDir = entries
  } catch (err) {
    diag.repoDir = `[error] ${err instanceof Error ? err.message : String(err)}`
  }

  return NextResponse.json(diag, { status: 200 })
}
