/**
 * Read spec tree from the local bare clone via git commands.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import { ensureBareClone } from './worktree'
import { buildSpecTree, type SpecTreeNode } from '../specs/specTree'

const execFileAsync = promisify(execFile)

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
  let barePath: string
  try {
    barePath = await ensureBareClone(owner, repo, token)
  } catch (err) {
    console.error(`[specs] Failed to ensure bare clone for ${owner}/${repo}:`, err)
    return { tree: [], files: [] }
  }

  // List all .md files under .workhorse/specs/ on this branch
  let lsOutput: string
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['ls-tree', '-r', '--name-only', `origin/${branch}`, '--', '.workhorse/specs/'],
      { cwd: barePath },
    )
    lsOutput = stdout.trim()
  } catch (err) {
    console.error(`[specs] ls-tree failed for origin/${branch} in ${barePath}:`, err)
    return { tree: [], files: [] }
  }

  if (!lsOutput) {
    console.warn(`[specs] No spec files found in ${owner}/${repo} on branch ${branch}`)
    return { tree: [], files: [] }
  }

  const allPaths = lsOutput.split('\n').filter(Boolean)
  const specPaths = allPaths.filter((p) => p.endsWith('.md'))

  const tree = buildSpecTree(specPaths)

  // Read content for each file using git show (local, instant)
  const files: RepoSpecFile[] = []
  for (const filePath of specPaths) {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['show', `origin/${branch}:${filePath}`],
        { cwd: barePath },
      )
      files.push({ path: filePath, content: stdout })
    } catch {
      // Skip files that can't be read
    }
  }

  return { tree, files }
}
