/**
 * Fetch design library files from a repo's .workhorse/design/ directory
 */

import { getRef, getTree, getFileContent } from './githubClient'
import { blobCache } from './blobCache'

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
  const ref = await getRef(token, owner, repo, branch)
  if (!ref) return []

  const treeData = await getTree(token, owner, repo, ref.object.sha, true)
  if (!treeData?.tree) return []

  const designItems = treeData.tree.filter(
    (item: { path: string; type: string; sha: string }) =>
      item.path.startsWith('.workhorse/design/') && item.type === 'blob',
  )

  // Fetch all files in parallel, using blob SHA cache
  const results = await Promise.all(
    designItems.map(async (item: { path: string; sha: string }) => {
      const cached = blobCache.get(item.sha)
      let decodedContent: string

      if (cached) {
        decodedContent = cached
      } else {
        const content = await getFileContent(token, owner, repo, item.path, branch)
        if (!content?.decodedContent) return null
        decodedContent = content.decodedContent
        blobCache.set(item.sha, decodedContent)
      }

      const relativePath = item.path.replace('.workhorse/design/', '')
      let type: DesignFile['type'] = 'markdown'

      if (relativePath.startsWith('components/')) type = 'component'
      else if (relativePath.startsWith('views/')) type = 'view'
      else if (relativePath.startsWith('mockups/')) type = 'mockup'

      return {
        path: item.path,
        name: relativePath,
        type,
        content: decodedContent,
      }
    }),
  )

  return results.filter((f): f is DesignFile => f !== null)
}
