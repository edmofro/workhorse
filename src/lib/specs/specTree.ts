/**
 * Spec tree utilities — build hierarchical tree from flat file paths
 */

import { humaniseFilename, deriveLabel } from '../labels'

export interface SpecTreeNode {
  /** Human-readable display label */
  name: string
  /** Original segment name (for matching) */
  slug: string
  path: string
  type: 'directory' | 'file'
  children: SpecTreeNode[]
}

/**
 * Build a tree structure from an array of file paths.
 * If a contentMap is provided, file nodes use deriveLabel (title from content → humanised filename).
 */
export function buildSpecTree(paths: string[], contentMap?: Map<string, string>): SpecTreeNode[] {
  const root: SpecTreeNode[] = []

  for (const fullPath of paths) {
    const parts = fullPath.split('/').filter(Boolean)
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      const existingNode = current.find((n) => n.slug === part)

      if (existingNode) {
        current = existingNode.children
      } else {
        const nodePath = parts.slice(0, i + 1).join('/')
        const displayName = isFile && contentMap
          ? deriveLabel(nodePath, contentMap.get(fullPath))
          : humaniseFilename(part)
        const newNode: SpecTreeNode = {
          name: displayName,
          slug: part,
          path: nodePath,
          type: isFile ? 'file' : 'directory',
          children: [],
        }
        current.push(newNode)
        current = newNode.children
      }
    }
  }

  // Sort: directories first, then alphabetically
  sortTree(root)
  return root
}

function sortTree(nodes: SpecTreeNode[]) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const node of nodes) {
    sortTree(node.children)
  }
}

/**
 * Extract area from a spec file path
 *
 * With the flat spec structure, all specs live directly in .workhorse/specs/,
 * so this always returns 'general'.
 * e.g., ".workhorse/specs/allergies.md" → "general"
 */
export function extractArea(filePath: string): string {
  return 'general'
}
