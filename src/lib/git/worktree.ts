/**
 * Git worktree management for target repo access.
 *
 * Storage layout:
 *   /data/repos/{owner}/{repo}/
 *     bare.git/                       — bare clone, shared objects
 *     worktrees/
 *       wh-042--{session-prefix}/     — one worktree per active card
 *
 * IMPORTANT: The bare clone must NOT be a mirror (--mirror). Mirror clones
 * use fetch refspec +refs/*:refs/* which overwrites ALL local refs on fetch,
 * including card branch refs — destroying worktree state. We use a regular
 * bare clone where remote refs live at refs/remotes/origin/* and local card
 * branches at refs/heads/* are safe from fetch.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execFileAsync = promisify(execFile)

const REPOS_BASE = process.env.REPOS_BASE_PATH ?? '/data/repos'

/** Validate that a resolved path is within the expected root directory. */
function assertPathWithin(root: string, resolved: string): void {
  const normalRoot = root.endsWith(path.sep) ? root : root + path.sep
  if (!resolved.startsWith(normalRoot) && resolved !== root) {
    throw new Error('Path traversal detected')
  }
}

/** Resolve a user-supplied file path within a worktree, preventing traversal. */
function safeResolvePath(wtPath: string, filePath: string): string {
  const resolved = path.resolve(/* turbopackIgnore: true */ wtPath, filePath)
  assertPathWithin(wtPath, resolved)
  return resolved
}

/** Get the bare clone path for a project */
export function bareClonePath(owner: string, repo: string): string {
  return path.join(/* turbopackIgnore: true */ REPOS_BASE, owner, repo, 'bare.git')
}

/** Get the worktrees directory for a project */
function worktreesDir(owner: string, repo: string): string {
  return path.join(/* turbopackIgnore: true */ REPOS_BASE, owner, repo, 'worktrees')
}

/** Get the worktree path for a specific card */
export function worktreePath(
  owner: string,
  repo: string,
  cardIdentifier: string,
): string {
  const slug = cardIdentifier.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return path.join(/* turbopackIgnore: true */ worktreesDir(owner, repo), slug)
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

/** Environment variables for git commands that need GitHub token auth. */
function tokenEnv(token: string): Record<string, string> {
  return {
    GIT_ASKPASS: '/bin/echo',
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_VALUE_0: `https://x-access-token:${token}@github.com`,
    GIT_CONFIG_KEY_0: `url.https://x-access-token:${token}@github.com.insteadOf`,
    GIT_CONFIG_COUNT: '1',
  }
}

/**
 * Throttle state for ensureBareClone — avoids fetching on every request.
 * Key: "owner/repo", Value: timestamp of last successful fetch.
 */
const lastFetchTime = new Map<string, number>()
const FETCH_INTERVAL_MS = 30_000
/** Tracks repos already checked for mirror→bare migration this process. */
const migratedRepos = new Set<string>()
/** Track in-flight background fetches to avoid duplicate git fetch processes. */
const pendingFetches = new Set<string>()

/**
 * Ensure the bare clone exists and is reasonably up to date.
 *
 * This is the single entry point that all bare-clone readers should call.
 * It creates the clone on first use and fetches periodically (every 30s)
 * to keep refs current without hammering GitHub on every page load.
 */
export async function ensureBareClone(
  owner: string,
  repo: string,
  token: string,
): Promise<string> {
  const barePath = bareClonePath(owner, repo)
  const repoKey = `${owner}/${repo}`
  let clonedJustNow = false

  // Create if missing, or replace if it's a legacy mirror clone
  try {
    await fs.access(barePath)

    // One-time check: ensure the bare clone has the correct fetch refspec.
    // Mirror clones (+refs/*:refs/*) overwrite card branches — wipe them.
    // Bare clones without a refspec (from earlier bug) need one configured.
    if (!migratedRepos.has(repoKey)) {
      try {
        const fetchSpec = await git(['config', '--get', 'remote.origin.fetch'], barePath)
        if (fetchSpec.includes('+refs/*:refs/*')) {
          console.warn(`[git] Migrating mirror clone for ${repoKey} — wiping bare clone and worktrees`)
          const repoDir = path.join(/* turbopackIgnore: true */ REPOS_BASE, owner, repo)
          await fs.rm(repoDir, { recursive: true, force: true })
          await createBareClone(owner, repo, token)
          clonedJustNow = true
          lastFetchTime.set(repoKey, Date.now())
        }
      } catch {
        // No fetch refspec configured — fix it and fetch
        console.warn(`[git] Bare clone for ${repoKey} missing fetch refspec, configuring`)
        await git(
          ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'],
          barePath,
        )
        // Update remote URL with current token before fetching
        const authedUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`
        await git(['remote', 'set-url', 'origin', authedUrl], barePath)
        await git(['fetch', 'origin'], barePath, { GIT_TERMINAL_PROMPT: '0' })
        lastFetchTime.set(repoKey, Date.now())
      }
      migratedRepos.add(repoKey)
    }
  } catch {
    await createBareClone(owner, repo, token)
    clonedJustNow = true
    lastFetchTime.set(repoKey, Date.now())
  }

  // Stale-while-revalidate: if the bare clone is stale, return it immediately
  // and trigger a background git fetch so the next caller gets fresh data.
  const lastFetch = lastFetchTime.get(repoKey) ?? 0
  if (!clonedJustNow && Date.now() - lastFetch > FETCH_INTERVAL_MS) {
    if (!pendingFetches.has(repoKey)) {
      pendingFetches.add(repoKey)
      // Set lastFetchTime optimistically to prevent duplicate fetches from
      // callers arriving while the background fetch is still in flight
      lastFetchTime.set(repoKey, Date.now())
      fetchBareClone(owner, repo, token)
        .catch((err) => console.warn(`[git] Background fetch failed for ${repoKey}:`, err))
        .finally(() => {
          // Update lastFetchTime on completion so the stale window starts
          // from when the fetch actually finished
          lastFetchTime.set(repoKey, Date.now())
          pendingFetches.delete(repoKey)
        })
    }
  }

  return barePath
}

/**
 * Create a bare clone of a repo.
 * Prefer ensureBareClone() which handles creation + refresh in one call.
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

  await fs.mkdir(path.dirname(/* turbopackIgnore: true */ barePath), { recursive: true })

  const cloneUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`
  await execFileAsync('git', ['clone', '--bare', cloneUrl, barePath], {
    maxBuffer: 50 * 1024 * 1024,
  })

  // --bare doesn't set up remote tracking refs. Configure the fetch refspec
  // so that `git fetch origin` populates refs/remotes/origin/* and
  // `origin/main` resolves correctly. This also ensures card branches at
  // refs/heads/* are never touched by fetch.
  await git(
    ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'],
    barePath,
  )
  await git(['fetch', 'origin'], barePath, { GIT_TERMINAL_PROMPT: '0' })

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
  // Update the remote URL with the current token so fetch uses valid auth
  const authedUrl = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`
  await git(['remote', 'set-url', 'origin', authedUrl], barePath)

  await git(['fetch', '--prune', 'origin'], barePath, {
    GIT_TERMINAL_PROMPT: '0',
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

  await fs.mkdir(path.dirname(/* turbopackIgnore: true */ wtPath), { recursive: true })

  // Check if the branch exists locally (from a previous worktree session)
  // or on the remote (pushed by a previous deploy)
  let startPoint: string | null = null
  try {
    await git(['rev-parse', '--verify', `refs/heads/${branchName}`], barePath)
    startPoint = branchName // local branch exists
  } catch {
    try {
      await git(['rev-parse', '--verify', `refs/remotes/origin/${branchName}`], barePath)
      startPoint = `origin/${branchName}` // remote branch exists
    } catch {
      // Branch doesn't exist anywhere — will create from default branch
    }
  }

  if (startPoint === branchName) {
    // Local branch exists — check it out
    await git(['worktree', 'add', wtPath, branchName], barePath)
  } else if (startPoint) {
    // Remote branch exists — create local tracking branch
    await git(['worktree', 'add', '-b', branchName, wtPath, startPoint], barePath)
  } else {
    // New branch from default branch
    await git(
      ['worktree', 'add', '-b', branchName, wtPath, `origin/${defaultBranch}`],
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

  // Stage all changes (specs, mockups, and code files)
  await git(['add', '-A'], wtPath)

  // Check if there are staged changes
  const staged = await git(['diff', '--cached', '--name-only'], wtPath)
  if (!staged) return []

  const changedFiles = staged.split('\n').filter(Boolean)

  // Commit with author info
  // Set committer identity via env vars so git doesn't require global config
  await git(
    [
      'commit',
      '-m', commitMessage,
      '--author', `${authorName} <${authorEmail}>`,
    ],
    wtPath,
    {
      GIT_COMMITTER_NAME: authorName,
      GIT_COMMITTER_EMAIL: authorEmail,
    },
  )

  // Push to remote using GIT_ASKPASS to avoid persisting token in config
  const branchName = await git(['rev-parse', '--abbrev-ref', 'HEAD'], wtPath)
  try {
    await git(['push', 'origin', branchName], wtPath, tokenEnv(token))
  } catch {
    throw new Error('git push failed')
  }

  return changedFiles
}

/**
 * Push the current branch to origin without committing.
 */
export async function pushBranch(
  owner: string,
  repo: string,
  cardIdentifier: string,
  token: string,
): Promise<void> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)
  const branchName = await git(['rev-parse', '--abbrev-ref', 'HEAD'], wtPath)
  try {
    await git(['push', 'origin', branchName], wtPath, tokenEnv(token))
  } catch {
    throw new Error('git push failed')
  }
}

/**
 * Pull remote changes into the worktree branch.
 * Uses rebase to keep a linear history.
 */
export async function pullBranch(
  owner: string,
  repo: string,
  cardIdentifier: string,
  token: string,
): Promise<void> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)

  // Fetch latest from origin
  const barePath = bareClonePath(owner, repo)
  try {
    await git(['fetch', 'origin'], barePath, tokenEnv(token))
  } catch {
    throw new Error('git fetch failed')
  }

  // Rebase onto remote tracking branch
  const branchName = await git(['rev-parse', '--abbrev-ref', 'HEAD'], wtPath)
  try {
    await git(['rebase', `origin/${branchName}`], wtPath)
  } catch {
    // Abort the in-progress rebase so the worktree isn't left in a broken state
    await git(['rebase', '--abort'], wtPath).catch(() => {})
    throw new Error('Rebase failed — there may be conflicts')
  }
}

/**
 * Get the list of spec/mockup files changed on a branch vs main.
 */
const MAX_CODE_FILES = 200

interface ChangedFilesResult {
  workhorseFiles: { filePath: string; isNew: boolean }[]
  codeFiles: { filePath: string; isNew: boolean; linesAdded?: number; linesRemoved?: number }[]
  codeFilesTruncated: boolean
}

export async function getChangedFiles(
  owner: string,
  repo: string,
  cardIdentifier: string,
  defaultBranch: string,
): Promise<ChangedFilesResult> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)
  const workhorseMap = new Map<string, boolean>()
  const codeFiles: { filePath: string; isNew: boolean; linesAdded?: number; linesRemoved?: number }[] = []
  let codeFilesTruncated = false

  // Committed changes: files changed on the card branch vs the default branch.
  // Run --name-status and --numstat in parallel for efficiency.
  try {
    const [nameStatus, numstat] = await Promise.all([
      git(['diff', '--name-status', `origin/${defaultBranch}...HEAD`], wtPath),
      git(['diff', '--numstat', `origin/${defaultBranch}...HEAD`], wtPath),
    ])

    // Build a map of file → { linesAdded, linesRemoved } from numstat
    const lineStats = new Map<string, { added: number; removed: number }>()
    for (const line of numstat.split('\n').filter(Boolean)) {
      const parts = line.split('\t')
      const added = parseInt(parts[0]!, 10)
      const removed = parseInt(parts[1]!, 10)
      const fp = parts[2]!
      if (!isNaN(added) && !isNaN(removed) && fp) {
        lineStats.set(fp, { added, removed })
      }
    }

    for (const line of nameStatus.split('\n').filter(Boolean)) {
      const parts = line.split('\t')
      const status = parts[0]!
      const filePath = status.startsWith('R') ? parts[2]! : parts[1]!
      if (filePath.startsWith('.workhorse/')) {
        workhorseMap.set(filePath, status === 'A')
      } else if (codeFiles.length < MAX_CODE_FILES) {
        const stats = lineStats.get(filePath)
        codeFiles.push({
          filePath,
          isNew: status === 'A',
          linesAdded: stats?.added,
          linesRemoved: stats?.removed,
        })
      } else {
        codeFilesTruncated = true
      }
    }
  } catch {
    // Diff may fail if the default branch ref doesn't exist yet — continue
    // to check working tree below.
  }

  // Uncommitted changes: files the agent has written but not yet committed.
  // This covers both staged/unstaged modifications and new untracked files.
  try {
    const porcelain = await git(['status', '--porcelain', '--', '.workhorse/'], wtPath)
    for (const line of porcelain.split('\n').filter(Boolean)) {
      const statusCodes = line.slice(0, 2)
      const filePath = line.slice(3)
      if (!filePath.startsWith('.workhorse/')) continue
      if (workhorseMap.has(filePath)) continue
      const isNew = statusCodes === '??' || statusCodes.startsWith('A')
      workhorseMap.set(filePath, isNew)
    }
  } catch {
    // Fall through
  }

  return {
    workhorseFiles: [...workhorseMap.entries()].map(([filePath, isNew]) => ({
      filePath,
      isNew,
    })),
    codeFiles,
    codeFilesTruncated,
  }
}

/**
 * Get the unified diff for a file against the base branch (origin/defaultBranch).
 */
export async function getFileDiffFromBase(
  owner: string,
  repo: string,
  cardIdentifier: string,
  defaultBranch: string,
  filePath: string,
): Promise<string | null> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)
  safeResolvePath(wtPath, filePath)

  try {
    return await git(['diff', `origin/${defaultBranch}...HEAD`, '--', filePath], wtPath)
  } catch {
    return null
  }
}

/**
 * Read a file's content from the base branch (origin/defaultBranch).
 * Returns null if the file doesn't exist on the base branch.
 */
export async function getBaseFileContent(
  owner: string,
  repo: string,
  cardIdentifier: string,
  defaultBranch: string,
  filePath: string,
): Promise<string | null> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)
  safeResolvePath(wtPath, filePath)

  try {
    return await git(['show', `origin/${defaultBranch}:${filePath}`], wtPath)
  } catch {
    return null
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

  await fs.mkdir(path.dirname(/* turbopackIgnore: true */ fullPath), { recursive: true })
  await fs.writeFile(fullPath, content, 'utf-8')
}

/**
 * Get the list of files with pending changes (staged or unstaged) in a worktree.
 * Used to generate a commit message before committing.
 */
export async function getPendingChanges(
  owner: string,
  repo: string,
  cardIdentifier: string,
): Promise<{ filePath: string; isNew: boolean }[]> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)
  try {
    const status = await git(['status', '--porcelain'], wtPath)
    if (!status) return []
    return status
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const code = line.slice(0, 2)
        const filePath = line.slice(3).trim()
        const isNew = code === '??' || code[0] === 'A' || code[1] === 'A'
        return { filePath, isNew }
      })
  } catch {
    return []
  }
}

/**
 * Get branch sync status for a card's worktree.
 * Returns local changes count, unpushed commit count, and remote-ahead count.
 */
export async function getBranchStatus(
  owner: string,
  repo: string,
  cardIdentifier: string,
  defaultBranch: string = 'main',
): Promise<{
  localChanges: number
  unpushedCommits: number
  remoteAhead: number
}> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)

  // git status --porcelain -b returns branch name + tracking info + changed files in one call
  const statusOutput = await git(['status', '--porcelain', '-b'], wtPath).catch(() => '')
  const lines = statusOutput.split('\n').filter(Boolean)

  // First line is branch header: "## branch...origin/branch [ahead N, behind M]"
  const headerLine = lines[0] ?? ''
  const localChanges = lines.length > 1 ? lines.length - 1 : 0

  // Parse branch name from header
  const branchMatch = headerLine.match(/^## (.+?)(?:\.{3}|$)/)
  const branchName = branchMatch?.[1]
  if (!branchName) return { localChanges, unpushedCommits: 0, remoteAhead: 0 }

  const hasTracking = headerLine.includes('...')

  if (!hasTracking) {
    // No remote tracking — count commits since branching from the default branch
    const mergeBase = await git(['merge-base', `origin/${defaultBranch}`, 'HEAD'], wtPath).catch(() => '')
    const count = mergeBase
      ? await git(['rev-list', '--count', `${mergeBase}..HEAD`], wtPath).catch(() => '0')
      : '0'
    return { localChanges, unpushedCommits: parseInt(count, 10) || 0, remoteAhead: 0 }
  }

  // Use rev-list --left-right --count to get ahead/behind in a single call
  const trackingBranch = `origin/${branchName}`
  const leftRight = await git(
    ['rev-list', '--left-right', '--count', `${trackingBranch}...HEAD`],
    wtPath,
  ).catch(() => '0\t0')
  const [behindStr, aheadStr] = leftRight.split('\t')

  return {
    localChanges,
    unpushedCommits: parseInt(aheadStr, 10) || 0,
    remoteAhead: parseInt(behindStr, 10) || 0,
  }
}

/**
 * Count how many commits the upstream (default branch or parent card branch)
 * has that aren't in the card's branch.
 */
export async function getUpstreamBehindCount(
  owner: string,
  repo: string,
  cardIdentifier: string,
  upstreamRef: string,
): Promise<number> {
  const wtPath = worktreePath(owner, repo, cardIdentifier)
  try {
    // How many commits on upstream that aren't in HEAD?
    const count = await git(['rev-list', '--count', `HEAD..origin/${upstreamRef}`], wtPath)
    return parseInt(count, 10) || 0
  } catch {
    return 0
  }
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
