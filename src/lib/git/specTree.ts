/**
 * Read spec tree from the local bare clone via git commands.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { ensureBareClone, getLocalGitDir } from './worktree'
import { buildSpecTree, type SpecTreeNode } from '../specs/specTree'

const execFileAsync = promisify(execFile)

export interface RepoSpecFile {
  path: string
  content: string
}

/**
 * Read spec files from a git directory (local repo or bare clone) for a given ref.
 */
async function readSpecsFromGitDir(
  gitDir: string,
  ref: string,
): Promise<{ tree: SpecTreeNode[]; files: RepoSpecFile[] }> {
  let lsOutput: string
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['ls-tree', '-r', '--name-only', ref, '--', '.workhorse/specs/'],
      { cwd: gitDir },
    )
    lsOutput = stdout.trim()
  } catch (err) {
    console.error(`[specs] ls-tree failed for ${gitDir} ref=${ref}:`, err)
    return { tree: [], files: [] }
  }

  if (!lsOutput) return { tree: [], files: [] }

  const allPaths = lsOutput.split('\n').filter(Boolean)
  const specPaths = allPaths.filter((p) => p.endsWith('.md'))

  const tree = buildSpecTree(specPaths)

  const files: RepoSpecFile[] = []
  for (const filePath of specPaths) {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['show', `${ref}:${filePath}`],
        { cwd: gitDir },
      )
      files.push({ path: filePath, content: stdout })
    } catch {
      // Skip files that can't be read
    }
  }

  return { tree, files }
}

/**
 * Fetch all .workhorse/specs/ files from a repository.
 * Prefers the local git repo if it matches, otherwise uses a bare clone.
 */
export async function fetchRepoSpecTree(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ tree: SpecTreeNode[]; files: RepoSpecFile[] }> {
  // Try local repo first (avoids needing a bare clone for the app's own repo)
  const localDir = await getLocalGitDir(owner, repo)
  if (localDir) {
    // Try the requested branch first
    const result = await readSpecsFromGitDir(localDir, `refs/heads/${branch}`)
    if (result.files.length > 0) {
      return result
    }
    // Fall back to HEAD (specs may be on the currently checked-out branch)
    const headResult = await readSpecsFromGitDir(localDir, 'HEAD')
    if (headResult.files.length > 0) {
      return headResult
    }
    console.warn(`[specs] Local repo matched but no specs found on branch ${branch} or HEAD`)
  }

  // Fall back to bare clone
  let barePath: string
  try {
    barePath = await ensureBareClone(owner, repo, token)
  } catch (err) {
    console.error(`[specs] Failed to ensure bare clone for ${owner}/${repo}:`, err)
    return { tree: [], files: [] }
  }

  return readSpecsFromGitDir(barePath, `refs/heads/${branch}`)
}
