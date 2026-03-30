'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { FileText, Image as ImageIcon, Plus, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { cn } from '../../lib/cn'
import { deriveLabel } from '../../lib/labels'
import type { SpecFileItem, MockupFileItem } from './types'

interface FilesPanelProps {
  specs: SpecFileItem[]
  mockups: MockupFileItem[]
  activeFilePath?: string | null
  onSelectFile: (filePath: string) => void
  onCreateSpec: () => void
  /** Display mode: 'sidebar' renders inline in layout flow, 'overlay' renders as
   *  an absolutely-positioned panel that hovers over adjacent content. */
  mode?: 'sidebar' | 'overlay'
  /** Whether the panel starts open (card home, chat) or collapsed (artifact mode) */
  defaultOpen?: boolean
}

/** Files panel listing card specs and mockups. Present in every view state.
 *  In artifact mode: collapsed by default, hover to peek as overlay.
 *  In card home / chat: open by default, collapsible. */
export function FilesPanel({
  specs,
  mockups,
  activeFilePath,
  onSelectFile,
  onCreateSpec,
  mode = 'sidebar',
  defaultOpen = true,
}: FilesPanelProps) {
  const [pinned, setPinned] = useState(defaultOpen)
  const [hovering, setHovering] = useState(false)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear pending hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  // Sync pinned state when parent changes defaultOpen (e.g. switching view modes)
  useEffect(() => {
    setPinned(defaultOpen)
  }, [defaultOpen])

  const hasFiles = specs.length > 0 || mockups.length > 0
  const isVisible = pinned || hovering

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    setHovering(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    // Small delay before hiding to prevent flicker
    hoverTimeoutRef.current = setTimeout(() => {
      setHovering(false)
    }, 150)
  }, [])

  const handleSelectFile = useCallback((filePath: string) => {
    onSelectFile(filePath)
    // Collapse after selection if in hover mode
    if (!pinned) {
      setHovering(false)
    }
  }, [onSelectFile, pinned])

  // Collapsed indicator (narrow strip on the right edge)
  if (!isVisible) {
    return (
      <aside
        className={cn(
          'shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col items-center pt-3 gap-3',
          mode === 'overlay' && 'absolute right-0 top-0 bottom-0 z-20',
          mode === 'sidebar' && 'relative',
        )}
        style={{ width: '36px' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          onClick={() => setPinned(true)}
          className="p-1.5 rounded-[var(--radius-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
          title="Show files"
        >
          <PanelRightOpen size={14} />
        </button>
        {hasFiles && (
          <span className="text-[10px] font-medium text-[var(--text-muted)] tabular-nums">
            {specs.length + mockups.length}
          </span>
        )}
      </aside>
    )
  }

  // Panel content (used for both pinned and overlay states)
  const panelContent = (
    <>
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
          Specs
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onCreateSpec}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-100 cursor-pointer"
            title="New spec"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => setPinned(false)}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
            title="Collapse files panel"
          >
            <PanelRightClose size={14} />
          </button>
        </div>
      </div>

      {specs.length === 0 && (
        <p className="px-3 py-2 text-[10px] text-[var(--text-faint)]">
          No specs yet
        </p>
      )}
      {specs.map((spec) => {
        const fileName = deriveLabel(spec.filePath, spec.content)
        const isActive = spec.filePath === activeFilePath
        return (
          <button
            key={spec.filePath}
            onClick={() => handleSelectFile(spec.filePath)}
            className={cn(
              'flex items-center gap-1 mx-1 px-2 py-1 rounded-[var(--radius-md)] text-left cursor-pointer transition-colors duration-100',
              isActive
                ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
          >
            <FileText size={11} className="shrink-0 text-[var(--text-muted)]" />
            <span className="text-[11px] font-medium truncate flex-1">{fileName}</span>
          </button>
        )
      })}

      {mockups.length > 0 && (
        <>
          <div className="flex items-center px-3 pt-3 pb-1">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
              Mockups
            </span>
          </div>
          {mockups.map((mockup) => {
            const fileName = deriveLabel(mockup.filePath, mockup.content)
            const isActive = mockup.filePath === activeFilePath
            return (
              <button
                key={mockup.filePath}
                onClick={() => handleSelectFile(mockup.filePath)}
                className={cn(
                  'flex items-center gap-1 mx-1 px-2 py-1 rounded-[var(--radius-md)] text-left cursor-pointer transition-colors duration-100',
                  isActive
                    ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
                )}
              >
                <ImageIcon size={11} className="shrink-0 text-[var(--text-muted)]" />
                <span className="text-[11px] font-medium truncate">{fileName}</span>
              </button>
            )
          })}
        </>
      )}
    </>
  )

  // Overlay mode (hover-to-peek, not pinned)
  if (!pinned && hovering) {
    return (
      <div
        className={cn(
          'shrink-0 relative',
          mode === 'overlay' && 'absolute right-0 top-0 bottom-0 z-20',
        )}
        style={{ width: '36px' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Overlay panel floating on top of content */}
        <aside
          className="absolute right-0 top-0 bottom-0 z-30 border-l border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col overflow-y-auto shadow-[var(--shadow-lg)]"
          style={{ width: '180px' }}
        >
          {panelContent}
        </aside>
      </div>
    )
  }

  // Pinned open mode (part of the layout flow)
  return (
    <aside
      className="shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col overflow-y-auto"
      style={{ width: '180px' }}
      onMouseLeave={handleMouseLeave}
    >
      {panelContent}
    </aside>
  )
}
