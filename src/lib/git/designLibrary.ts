/**
 * Read design library files from the local bare clone.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import { bareClonePath, createBareClone, fetchBareClone } from './worktree'

const execFileAsync = promisify(execFile)

/** Throttle fetches to at most once per 30 seconds per repo */
const lastFetchTime = new Map<string, number>()
const FETCH_INTERVAL_MS = 30_000

export interface DesignFile {
  path: string
  name: string
  type: 'markdown' | 'component' | 'view' | 'mockup'
  content: string
}

export async function fetchDesignLibrary(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<DesignFile[]> {
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
      return []
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

  // List all files under .workhorse/design/ on this branch
  let lsOutput: string
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['ls-tree', '-r', '--name-only', `refs/heads/${branch}`, '--', '.workhorse/design/'],
      { cwd: barePath },
    )
    lsOutput = stdout.trim()
  } catch {
    return []
  }

  if (!lsOutput) return []

  const allPaths = lsOutput.split('\n').filter(Boolean)

  // Read content for each file using git show (local, instant)
  const files: DesignFile[] = []
  for (const filePath of allPaths) {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['show', `refs/heads/${branch}:${filePath}`],
        { cwd: barePath },
      )

      const relativePath = filePath.replace('.workhorse/design/', '')
      let type: DesignFile['type'] = 'markdown'

      if (relativePath.startsWith('components/')) type = 'component'
      else if (relativePath.startsWith('views/')) type = 'view'
      else if (relativePath.startsWith('mockups/')) type = 'mockup'

      files.push({
        path: filePath,
        name: relativePath,
        type,
        content: stdout,
      })
    } catch {
      // Skip files that can't be read
    }
  }

  return files
}
