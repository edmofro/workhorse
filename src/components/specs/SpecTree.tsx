'use client'

import { useState } from 'react'
import { ChevronRight, FileText, FolderOpen, Folder } from 'lucide-react'
import { cn } from '../../lib/cn'
import { buildSpecTree, type SpecTreeNode } from '../../lib/specs/specTree'

interface SpecTreeProps {
  files: string[]
  selectedPath: string | null
  onSelect: (path: string) => void
}

export function SpecTree({ files, selectedPath, onSelect }: SpecTreeProps) {
  const tree = buildSpecTree(files)

  return (
    <div>
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  )
}

function TreeNode({
  node,
  selectedPath,
  onSelect,
  depth,
}: {
  node: SpecTreeNode
  selectedPath: string | null
  onSelect: (path: string) => void
  depth: number
}) {
  const [expanded, setExpanded] = useState(true)
  const isSelected = node.path === selectedPath
  const isDir = node.type === 'directory'

  return (
    <div>
      <button
        onClick={() => {
          if (isDir) {
            setExpanded(!expanded)
          } else {
            onSelect(node.path)
          }
        }}
        className={cn(
          'w-full flex items-center gap-1 py-[4px] rounded-[var(--radius-md)] text-left cursor-pointer transition-colors duration-100',
          isSelected
            ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
        )}
        style={{ paddingLeft: `${8 + depth * 12}px`, paddingRight: '8px' }}
      >
        {isDir ? (
          <>
            <ChevronRight
              size={12}
              className={cn(
                'shrink-0 transition-transform duration-100 text-[var(--text-muted)]',
                expanded && 'rotate-90',
              )}
            />
            {expanded ? (
              <FolderOpen size={13} className="shrink-0 text-[var(--text-muted)]" />
            ) : (
              <Folder size={13} className="shrink-0 text-[var(--text-muted)]" />
            )}
          </>
        ) : (
          <FileText size={13} className="shrink-0 text-[var(--text-muted)] ml-[12px]" />
        )}
        <span className="text-[12px] truncate">{node.name}</span>
      </button>
      {isDir && expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
