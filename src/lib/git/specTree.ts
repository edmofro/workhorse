/**
 * Read spec tree from the local bare clone via git commands.
 * Falls back to GitHub API if the bare clone doesn't exist yet.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import { bareClonePath, createBareClone, fetchBareClone } from './worktree'
import { buildSpecTree, type SpecTreeNode } from '../specs/specTree'

const execFileAsync = promisify(execFile)

/** Throttle fetches to at most once per 30 seconds per repo */
const lastFetchTime = new Map<string, number>()
const FETCH_INTERVAL_MS = 30_000

export interface RepoSpecFile {
  path: string
  content: string
}

/**
 * Fetch all .workhorse/specs/ files from a repository's local bare clone.
 */
export async function fetchRepoSpecTree(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ tree: SpecTreeNode[]; files: RepoSpecFile[] }> {
  const barePath = bareClonePath(owner, repo)

  const repoKey = `${owner}/${repo}`
  let clonedJustNow = false

  // Ensure bare clone exists; create if missing
  try {
    await fs.access(barePath)
  } catch {
    try {
      await createBareClone(owner, repo, token)
      clonedJustNow = true
      lastFetchTime.set(repoKey, Date.now())
    } catch {
      return { tree: [], files: [] }
    }
  }

  // Fetch latest refs, throttled to avoid hammering on every page load
  const lastFetch = lastFetchTime.get(repoKey) ?? 0
  if (!clonedJustNow && Date.now() - lastFetch > FETCH_INTERVAL_MS) {
    try {
      await fetchBareClone(owner, repo, token)
      lastFetchTime.set(repoKey, Date.now())
    } catch {
      // Continue with potentially stale data rather than failing
    }
  }

  // List all .md files under .workhorse/specs/ on this branch
  let lsOutput: string
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['ls-tree', '-r', '--name-only', `refs/heads/${branch}`, '--', '.workhorse/specs/'],
      { cwd: barePath },
    )
    lsOutput = stdout.trim()
  } catch {
    return { tree: [], files: [] }
  }

  if (!lsOutput) return { tree: [], files: [] }

  const allPaths = lsOutput.split('\n').filter(Boolean)
  const specPaths = allPaths.filter((p) => p.endsWith('.md'))

  const tree = buildSpecTree(specPaths)

  // Read content for each file using git show (local, instant)
  const files: RepoSpecFile[] = []
  for (const filePath of specPaths) {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['show', `refs/heads/${branch}:${filePath}`],
        { cwd: barePath },
      )
      files.push({ path: filePath, content: stdout })
    } catch {
      // Skip files that can't be read
    }
  }

  return { tree, files }
}
