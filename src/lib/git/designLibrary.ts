/**
 * Fetch design library files from a repo's .workhorse/design/ directory
 */

import { getRef, getTree, getFileContent } from './githubClient'

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

  const designFiles = treeData.tree.filter(
    (item: { path: string; type: string }) =>
      item.path.startsWith('.workhorse/design/') && item.type === 'blob',
  )

  const files: DesignFile[] = []

  for (const item of designFiles) {
    const content = await getFileContent(token, owner, repo, item.path, branch)
    if (!content?.decodedContent) continue

    const relativePath = item.path.replace('.workhorse/design/', '')
    let type: DesignFile['type'] = 'markdown'

    if (relativePath.startsWith('components/')) type = 'component'
    else if (relativePath.startsWith('views/')) type = 'view'
    else if (relativePath.startsWith('mockups/')) type = 'mockup'

    files.push({
      path: item.path,
      name: relativePath,
      type,
      content: content.decodedContent,
    })
  }

  return files
}
