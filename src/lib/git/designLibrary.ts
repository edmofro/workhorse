/**
 * Read design library files from the local bare clone.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { ensureBareClone, getLocalGitDir } from './worktree'

const execFileAsync = promisify(execFile)

export interface DesignFile {
  path: string
  name: string
  type: 'markdown' | 'component' | 'view' | 'mockup'
  content: string
}

/**
 * Read design files from a git directory (local repo or bare clone) for a given ref.
 */
async function readDesignFromGitDir(
  gitDir: string,
  ref: string,
): Promise<DesignFile[]> {
  let lsOutput: string
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['ls-tree', '-r', '--name-only', ref, '--', '.workhorse/design/'],
      { cwd: gitDir },
    )
    lsOutput = stdout.trim()
  } catch (err) {
    console.error(`[design] ls-tree failed for ${gitDir} ref=${ref}:`, err)
    return []
  }

  if (!lsOutput) return []

  const allPaths = lsOutput.split('\n').filter(Boolean)

  const files: DesignFile[] = []
  for (const filePath of allPaths) {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['show', `${ref}:${filePath}`],
        { cwd: gitDir },
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

/**
 * Fetch design library files from a repository.
 * Prefers the local git repo if it matches, otherwise uses a bare clone.
 */
export async function fetchDesignLibrary(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<DesignFile[]> {
  // Try local repo first (avoids needing a bare clone for the app's own repo)
  const localDir = await getLocalGitDir(owner, repo)
  if (localDir) {
    // Try the requested branch first
    const result = await readDesignFromGitDir(localDir, `refs/heads/${branch}`)
    if (result.length > 0) {
      return result
    }
    // Fall back to HEAD (design files may be on the currently checked-out branch)
    const headResult = await readDesignFromGitDir(localDir, 'HEAD')
    if (headResult.length > 0) {
      return headResult
    }
    console.warn(`[design] Local repo matched but no design files found on branch ${branch} or HEAD`)
  }

  // Fall back to bare clone
  let barePath: string
  try {
    barePath = await ensureBareClone(owner, repo, token)
  } catch (err) {
    console.error(`[design] Failed to ensure bare clone for ${owner}/${repo}:`, err)
    return []
  }

  return readDesignFromGitDir(barePath, `refs/heads/${branch}`)
}
