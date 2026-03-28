'use client'

import { useState } from 'react'
import { MockupPreview } from './MockupPreview'
import { MockupViewer } from './MockupViewer'

interface Mockup {
  id: string
  title: string
  html: string
}

interface MockupsPanelProps {
  mockups: Mockup[]
}

export function MockupsPanel({ mockups }: MockupsPanelProps) {
  const [viewerMockup, setViewerMockup] = useState<Mockup | null>(null)

  if (mockups.length === 0) return null

  return (
    <>
      <div className="border-t border-[var(--border-subtle)] mt-6 pt-6">
        <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em] mb-3">
          Mockups
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {mockups.map((mockup) => (
            <MockupPreview
              key={mockup.id}
              title={mockup.title}
              html={mockup.html}
              onExpand={() => setViewerMockup(mockup)}
            />
          ))}
        </div>
      </div>

      {viewerMockup && (
        <MockupViewer
          mockup={viewerMockup}
          onClose={() => setViewerMockup(null)}
        />
      )}
    </>
  )
}
