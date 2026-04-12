'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { cn } from '../../lib/cn'
import type { DeviceKey } from './SpecHeaderBar'

const DEVICE_WIDTHS: Record<DeviceKey, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

interface MockupArtifactProps {
  html: string
  title: string
  device: DeviceKey
  isEditing?: boolean
  onContentChange?: (html: string) => void
}

/** Renders a mockup HTML file as an artifact (inline, not full-screen overlay).
 *  In read mode: shows rendered HTML in an iframe with device-responsive sizing.
 *  In edit mode: preview on top, source editor on bottom. */
export function MockupArtifact({
  html,
  title,
  device,
  isEditing = false,
  onContentChange,
}: MockupArtifactProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [editSource, setEditSource] = useState(html)

  // Sync editSource when html changes externally (e.g. file switch)
  useEffect(() => {
    setEditSource(html)
  }, [html])

  const handleSourceChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value
    setEditSource(newHtml)
    onContentChange?.(newHtml)
  }, [onContentChange])

  // In read mode, use the html prop directly. In edit mode, use local editSource.
  const displayHtml = isEditing ? editSource : html

  if (isEditing) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Preview (top half) */}
        <div className="flex-1 overflow-auto bg-[var(--bg-mockup-stage)] min-h-0">
          <div className="flex items-start justify-center p-4">
            <div
              className={cn(
                'bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] overflow-hidden transition-[width] duration-300 ease-out',
              )}
              style={{
                width: DEVICE_WIDTHS[device],
                maxWidth: '100%',
              }}
            >
              {/* sandbox: allow-scripts enables JS; allow-same-origin is intentionally
                 omitted so mockup HTML cannot access parent page storage/cookies.
                 Trade-off: external font links and relative asset URLs won't load. */}
              <iframe
                ref={iframeRef}
                srcDoc={displayHtml}
                className="w-full border-none"
                style={{ minHeight: '200px' }}
                sandbox="allow-scripts"
                title={title}
              />
            </div>
          </div>
        </div>

        {/* Source editor (bottom half) */}
        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-page)] flex flex-col" style={{ height: '40%', minHeight: '160px' }}>
          <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
              Source
            </span>
          </div>
          <textarea
            value={editSource}
            onChange={handleSourceChange}
            className="flex-1 w-full p-3 text-[12px] font-mono leading-relaxed bg-[var(--bg-page)] text-[var(--text-primary)] border-none outline-none resize-none"
            spellCheck={false}
          />
        </div>
      </div>
    )
  }

  // Read-only mode
  return (
    <div className="flex-1 overflow-auto bg-[var(--bg-mockup-stage)]">
      <div className="flex items-start justify-center p-6">
        <div
          className={cn(
            'bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] overflow-hidden transition-[width] duration-300 ease-out',
          )}
          style={{
            width: DEVICE_WIDTHS[device],
            maxWidth: '100%',
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={displayHtml}
            className="w-full border-none"
            style={{ minHeight: '400px' }}
            sandbox="allow-scripts"
            title={title}
          />
        </div>
      </div>
    </div>
  )
}
