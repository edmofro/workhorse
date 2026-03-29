/**
 * Git worktree management for target repo access.
 *
 * Storage layout:
 *   /data/repos/{owner}/{repo}/
 *     bare.git/                       — bare mirror clone, shared objects
 *     worktrees/
 *       wh-042--{session-prefix}/     — one worktree per active card
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execFileAsync = promisify(execFile)

const REPOS_BASE = process.env.REPOS_BASE_PATH ?? '/data/repos'

const SHA_RE = /^[a-f0-9]{7,40}$/

/** Validate that a resolved path is within the expected root directory. */
function assertPathWithin(root: string, resolved: string): void {
  const normalRoot = root.endsWith(path.sep) ? root : root + path.sep
  if (!resolved.startsWith(normalRoot) && resolved !== root) {
    throw new Error('Path traversal detected')
  }
}

/** Resolve a user-supplied file path within a worktree, preventing traversal. */
function safeResolvePath(wtPath: string, filePath: string): string {
  const resolved = path.resolve(wtPath, filePath)
  assertPathWithin(wtPath, resolved)
  return resolved
}

/** Validate a git SHA. */
function assertValidSha(sha: string): void {
  if (!SHA_RE.test(sha)) {
    throw new Error('Invalid SHA')
  }
}

/** Get the bare clone path for a project */
export function bareClonePath(owner: string, repo: string): string {
  return path.join(REPOS_BASE, owner, repo, 'bare.git')
}

/** Get the worktrees directory for a project */
function worktreesDir(owner: string, repo: string): string {
  return path.join(REPOS_BASE, owner, repo, 'worktrees')
}

/** Get the worktree path for a specific card */
export function worktreePath(
  owner: string,
  repo: string,
  cardIdentifier: string,
): string {
  const slug = cardIdentifier.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return path.join(worktreesDir(owner, repo), slug)
}

/** Run a git command in a specific directory */
async function git(
  args: string[],
  cwd: string,
  env?: Record<string, string>,
): Promise<string> {
  const mergedEnv = { ...process.env, ...env }
  const { stdout } = await execFileAsync('git', args, {
    cwd,
    env: mergedEnv,
    maxBuffer: 50 * 1024 * 1024, // 50MB for large repos
  })
  return stdout.trim()
}

/**
 * Create a bare mirror clone of a repo.
 * Called on product registration.
 */
export async function createBareClone(
  owner: string,
  repo: string,
  token: string,
): Promise<string> {
  const barePath = bareClonePath(owner, repo)

  // Check if already exists
  try {
    await fs.access(barePath)
    return barePath
  } catch {
    // Does not exist, create it
  }

  await fs.mkdir(path.dirname(barePath), { recursive: true })

  const cloneUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`
  await execFileAsync('git', ['clone', '--mirror', cloneUrl, barePath], {
    maxBuffer: 50 * 1024 * 1024,
  })

  return barePath
}

/**
 * Fetch latest changes into the bare clone.
 * Called before each session starts.
 */
export async function fetchBareClone(
  owner: string,
  repo: string,
  token: string,
): Promise<void> {
  const barePath = bareClonePath(owner, repo)
  // Use GIT_CONFIG env vars to inject auth without persisting token in config
  await git(['fetch', '--prune', 'origin'], barePath, {
    GIT_ASKPASS: '/bin/echo',
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_VALUE_0: `https://x-access-token:${token}@github.com`,
    GIT_CONFIG_KEY_0: `url.https://x-access-token:${token}@github.com.insteadOf`,
    GIT_CONFIG_COUNT: '1',
  })
}

/**
 * Create a worktree for a card, checked out at the card's branch.
 * If the branch doesn't exist, creates it from the default branch.
 */
export async function createWorktree(
  owner: string,
  repo: string,
  cardIdentifier: string,
  branchName: string,
  defaultBranch: string,
): Promise<string> {
  const barePath = bareClonePath(owner, repo)
  const wtPath = worktreePath(owner, repo, cardIdentifier)

  // Check if worktree already exists
  try {
    await fs.access(wtPath)
    return wtPath
  } catch {
    // Does not exist, create it
  }

  await fs.mkdir(path.dirname(wtPath), { recursive: true })

  // Check if the branch exists in the bare clone
  let branchExists = false
  try {
    await git(['rev-parse', '--verify', `refs/heads/${branchName}`], barePath)
    branchExists = true
  } catch {
    // Branch doesn't exist yet
  }

  if (branchExists) {
    await git(['worktree', 'add', wtPath, branchName], barePath)
  } else {
    // Create branch from default branch
    await git(
      ['worktree', 'add', '-b', branchName, wtPath, `refs/heads/${defaultBranch}`],
      barePath,
    )
  }

  return wtPath
}

/**
 * Remove a worktree for a card.
 */
export async function removeWorktree(
  owner: string,
  repo: string,
  cardIdentifier: string,
): Promise<void> {
  const barePath = bareClonePath(owner, repo)
  const wtPath = worktreePath(owner, repo, cardIdentifier)

  try {
    await git(['worktree', 'remove', '--force', wtPath], barePath)
  } catch {
    // Worktree may already be removed, clean up directory if it exists
    try {
      await fs.rm(wtPath, { recursive: true, force: true })
    } catch {
      // Ignore
    }
  }

  // Prune stale worktree references
  try {
    await git(['worktree', 'prune'], barePath)
  } catch {
    // Ignore
  }
}

/**
 * Check if a worktree exists on disk.
 */
export async function worktreeExists(
  owner: string,
  repo: string,
  cardIdentifier: string,
): Promise<boolean> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)
  try {
    await fs.access(wtPath)
    return true
  } catch {
    return false
  }
}

/**
 * Auto-commit changed files in a worktree and push to remote.
 * Returns the list of files that were committed.
 */
export async function autoCommit(
  owner: string,
  repo: string,
  cardIdentifier: string,
  commitMessage: string,
  authorName: string,
  authorEmail: string,
  token: string,
): Promise<string[]> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)

  // Check for changes
  const status = await git(['status', '--porcelain'], wtPath)
  if (!status) return []

  // Stage all changes in .workhorse/ directory
  await git(['add', '.workhorse/'], wtPath)

  // Check if there are staged changes
  const staged = await git(['diff', '--cached', '--name-only'], wtPath)
  if (!staged) return []

  const changedFiles = staged.split('\n').filter(Boolean)

  // Commit with author info
  await git(
    [
      'commit',
      '-m', commitMessage,
      '--author', `${authorName} <${authorEmail}>`,
    ],
    wtPath,
  )

  // Push to remote using GIT_ASKPASS to avoid persisting token in config
  const branchName = await git(['rev-parse', '--abbrev-ref', 'HEAD'], wtPath)
  await git(['push', 'origin', branchName], wtPath, {
    GIT_ASKPASS: '/bin/echo',
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_VALUE_0: `https://x-access-token:${token}@github.com`,
    GIT_CONFIG_KEY_0: `url.https://x-access-token:${token}@github.com.insteadOf`,
    GIT_CONFIG_COUNT: '1',
  })

  return changedFiles
}

/**
 * Get the list of spec/mockup files changed on a branch vs main.
 */
export async function getChangedFiles(
  owner: string,
  repo: string,
  cardIdentifier: string,
  defaultBranch: string,
): Promise<{ filePath: string; isNew: boolean }[]> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)

  try {
    const diff = await git(
      ['diff', '--name-status', `origin/${defaultBranch}...HEAD`],
      wtPath,
    )

    return diff
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('\t')
        const status = parts[0]!
        // For renames (R100), the new path is the third column
        const filePath = status.startsWith('R') ? parts[2]! : parts[1]!
        return { status, filePath }
      })
      .filter(({ filePath }) => filePath.startsWith('.workhorse/'))
      .map(({ status, filePath }) => ({
        filePath,
        isNew: status === 'A',
      }))
  } catch {
    return []
  }
}

/**
 * Get the commit log for a specific file (for per-file version history).
 */
export async function getFileHistory(
  owner: string,
  repo: string,
  cardIdentifier: string,
  filePath: string,
): Promise<{ sha: string; message: string; author: string; date: string }[]> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)

  try {
    const log = await git(
      ['log', '--format=%H\t%s\t%an\t%aI', '--', filePath],
      wtPath,
    )

    return log
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, message, author, date] = line.split('\t')
        return { sha: sha!, message: message!, author: author!, date: date! }
      })
  } catch {
    return []
  }
}

/**
 * Get the content of a file at a specific commit.
 */
export async function getFileAtCommit(
  owner: string,
  repo: string,
  cardIdentifier: string,
  sha: string,
  filePath: string,
): Promise<string | null> {
  assertValidSha(sha)
  const wtPath = worktreePath(owner, repo, cardIdentifier)
  safeResolvePath(wtPath, filePath) // validate path doesn't escape worktree

  try {
    return await git(['show', `${sha}:${filePath}`], wtPath)
  } catch {
    return null
  }
}

/**
 * Get the diff between two commits for a specific file.
 */
export async function getFileDiff(
  owner: string,
  repo: string,
  cardIdentifier: string,
  sha1: string,
  sha2: string,
  filePath: string,
): Promise<string> {
  assertValidSha(sha1)
  assertValidSha(sha2)
  const wtPath = worktreePath(owner, repo, cardIdentifier)
  safeResolvePath(wtPath, filePath) // validate path doesn't escape worktree

  try {
    return await git(['diff', sha1, sha2, '--', filePath], wtPath)
  } catch {
    return ''
  }
}

/**
 * Read a file from the worktree.
 */
export async function readWorktreeFile(
  owner: string,
  repo: string,
  cardIdentifier: string,
  filePath: string,
): Promise<string | null> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)
  const fullPath = safeResolvePath(wtPath, filePath)

  try {
    return await fs.readFile(fullPath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * Write a file to the worktree.
 */
export async function writeWorktreeFile(
  owner: string,
  repo: string,
  cardIdentifier: string,
  filePath: string,
  content: string,
): Promise<void> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)
  const fullPath = safeResolvePath(wtPath, filePath)

  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, content, 'utf-8')
}

/**
 * List spec files in the worktree that have been changed from the default branch.
 */
export async function listWorktreeSpecFiles(
  owner: string,
  repo: string,
  cardIdentifier: string,
): Promise<string[]> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)

  try {
    // List all .workhorse/specs/ files in the worktree
    const result = await git(
      ['ls-files', '--', '.workhorse/specs/'],
      wtPath,
    )
    return result.split('\n').filter(Boolean)
  } catch {
    return []
  }
}
