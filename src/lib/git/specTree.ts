/**
 * Fetch spec tree from a repo's main branch via GitHub API
 */

import { getRef, getTree, getFileContent } from './githubClient'
import { buildSpecTree, type SpecTreeNode } from '../specs/specTree'

export interface RepoSpecFile {
  path: string
  content: string
}

/**
 * Fetch all .workhorse/specs/ files from a repository
 */
export async function fetchRepoSpecTree(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ tree: SpecTreeNode[]; files: RepoSpecFile[] }> {
  const ref = await getRef(token, owner, repo, branch)
  if (!ref) return { tree: [], files: [] }

  const treeData = await getTree(token, owner, repo, ref.object.sha, true)
  if (!treeData?.tree) return { tree: [], files: [] }

  const specFiles = treeData.tree.filter(
    (item: { path: string; type: string }) =>
      item.path.startsWith('.workhorse/specs/') &&
      item.path.endsWith('.md') &&
      item.type === 'blob',
  )

  const paths = specFiles.map((f: { path: string }) => f.path)
  const tree = buildSpecTree(paths)

  // Fetch content for all files
  const files: RepoSpecFile[] = []
  for (const specFile of specFiles) {
    const content = await getFileContent(token, owner, repo, specFile.path, branch)
    if (content?.decodedContent) {
      files.push({
        path: specFile.path,
        content: content.decodedContent,
      })
    }
  }

  return { tree, files }
}
