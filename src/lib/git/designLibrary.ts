/**
 * Fetch design library files from a repo via GitHub API.
 */

import { getRef, getTree, getFileContent } from './githubClient'

export interface DesignFile {
  path: string
  name: string
  type: 'markdown' | 'component' | 'view' | 'mockup'
  content: string
}

/**
 * Fetch all .workhorse/design/ files from a repository via GitHub API.
 */
export async function fetchDesignLibrary(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<DesignFile[]> {
  const ref = await getRef(token, owner, repo, branch)
  if (!ref) {
    console.error(`[design] Could not resolve ref for ${owner}/${repo} branch=${branch}`)
    return []
  }

  const treeData = await getTree(token, owner, repo, ref.object.sha, true)
  if (!treeData?.tree) {
    console.error(`[design] Could not fetch tree for ${owner}/${repo}`)
    return []
  }

  const designEntries = treeData.tree.filter(
    (item: { path: string; type: string }) =>
      item.path.startsWith('.workhorse/design/') &&
      item.type === 'blob',
  )

  // Fetch content for all files in parallel
  const results = await Promise.all(
    designEntries.map(async (entry: { path: string }) => {
      const content = await getFileContent(token, owner, repo, entry.path, branch)
      if (!content?.decodedContent) return null

      const relativePath = entry.path.replace('.workhorse/design/', '')
      let type: DesignFile['type'] = 'markdown'

      if (relativePath.startsWith('components/')) type = 'component'
      else if (relativePath.startsWith('views/')) type = 'view'
      else if (relativePath.startsWith('mockups/')) type = 'mockup'

      return {
        path: entry.path,
        name: relativePath,
        type,
        content: content.decodedContent,
      }
    }),
  )

  return results.filter((f): f is DesignFile => f !== null)
}
