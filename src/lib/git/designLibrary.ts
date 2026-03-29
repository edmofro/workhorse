/**
 * Read design library files from the local bare clone.
 */

import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import { bareClonePath } from './worktree'

const execFileAsync = promisify(execFile)

export interface DesignFile {
  path: string
  name: string
  type: 'markdown' | 'component' | 'view' | 'mockup'
  content: string
}

export async function fetchDesignLibrary(
  _token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<DesignFile[]> {
  const barePath = bareClonePath(owner, repo)

  // Check bare clone exists
  try {
    await fs.access(barePath)
  } catch {
    return []
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
