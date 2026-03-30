'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Component, Layout, Image } from 'lucide-react'
import { cn } from '../../lib/cn'
import { deriveLabel } from '../../lib/labels'
import { DesignPreview } from './DesignPreview'

interface DesignFile {
  path: string
  name: string
  type: 'markdown' | 'component' | 'view' | 'mockup'
  content: string
}

interface DesignBrowserProps {
  owner: string
  repoName: string
  defaultBranch: string
}

const TYPE_CONFIG = {
  markdown: { label: 'Docs', icon: FileText },
  component: { label: 'Components', icon: Component },
  view: { label: 'Views', icon: Layout },
  mockup: { label: 'Mockups', icon: Image },
} as const

export function DesignBrowser({ owner, repoName, defaultBranch }: DesignBrowserProps) {
  const queryClient = useQueryClient()
  const [selectedFile, setSelectedFile] = useState<DesignFile | null>(null)
  const [activeType, setActiveType] = useState<string | null>(null)

  const { data: files = [], isLoading: loading } = useQuery({
    queryKey: ['design-library', owner, repoName, defaultBranch],
    queryFn: async () => {
      const res = await fetch(
        `/api/design-library?owner=${owner}&repo=${repoName}&branch=${defaultBranch}`,
      )
      if (!res.ok) return []
      return res.json() as Promise<DesignFile[]>
    },
    staleTime: 60_000,
  })

  // Auto-select first file when data loads
  useEffect(() => {
    if (files.length > 0 && selectedFile === null) {
      setSelectedFile(files[0])
    }
  }, [files.length, selectedFile])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-[var(--text-muted)]">Loading design library...</p>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-[360px]">
          <p className="text-[14px] text-[var(--text-muted)] mb-1">No design library found</p>
          <p className="text-[13px] text-[var(--text-faint)]">
            Create a <code className="text-[12px] bg-[var(--bg-inset)] px-1 rounded">.workhorse/design/</code> directory in the repository to get started.
          </p>
        </div>
      </div>
    )
  }

  const filteredFiles = activeType
    ? files.filter((f) => f.type === activeType)
    : files

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className="flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-page)] shrink-0 overflow-hidden"
        style={{ width: '220px' }}
      >
        {/* Type filters */}
        <div className="p-3 border-b border-[var(--border-subtle)]">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveType(null)}
              className={cn(
                'px-2 py-1 text-[11px] font-medium rounded-[var(--radius-md)] cursor-pointer transition-colors duration-100',
                !activeType
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
              )}
            >
              All
            </button>
            {(Object.keys(TYPE_CONFIG) as (keyof typeof TYPE_CONFIG)[]).map((type) => {
              const config = TYPE_CONFIG[type]
              return (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={cn(
                    'px-2 py-1 text-[11px] font-medium rounded-[var(--radius-md)] cursor-pointer transition-colors duration-100',
                    activeType === type
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
                  )}
                >
                  {config.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredFiles.map((file) => {
            const config = TYPE_CONFIG[file.type]
            const Icon = config.icon
            const isSelected = selectedFile?.path === file.path

            return (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-[6px] rounded-[var(--radius-md)] text-left cursor-pointer transition-colors duration-100',
                  isSelected
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                )}
              >
                <Icon size={13} className="shrink-0 text-[var(--text-muted)]" />
                <span className="text-[12px] truncate">{deriveLabel(file.name, file.content)}</span>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto flex justify-center">
        {selectedFile ? (
          <DesignPreview
            file={selectedFile}
            owner={owner}
            repo={repoName}
            branch={defaultBranch}
            onFileUpdated={(path, newContent) => {
              const cacheKey = ['design-library', owner, repoName, defaultBranch]
              queryClient.setQueryData<DesignFile[]>(cacheKey, (prev) =>
                prev?.map((f) => (f.path === path ? { ...f, content: newContent } : f)),
              )
              if (selectedFile.path === path) {
                setSelectedFile({ ...selectedFile, content: newContent })
              }
            }}
          />
        ) : (
          <div className="text-center py-16 text-[var(--text-muted)] text-[13px]">
            Select a file to preview
          </div>
        )}
      </div>
    </div>
  )
}
