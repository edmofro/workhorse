'use client'

import { useState, useCallback } from 'react'
import { SpecEditor } from './SpecEditor'
import { ChatSidebar } from './ChatSidebar'
import { SpecListSidebar } from './SpecListSidebar'
import { buildDefaultSpec } from '../../lib/specs/format'
import { createSpec } from '../../lib/actions/specs'
import { useUser } from '../UserProvider'

interface SpecData {
  id: string
  filePath: string
  isNew: boolean
  content: string
}

interface SpecTabProps {
  feature: {
    id: string
    identifier: string
    title: string
  }
  specs: SpecData[]
  messages: {
    id: string
    role: string
    content: string
    userName?: string
    createdAt: string
  }[]
}

export function SpecTab({ feature, specs: initialSpecs, messages }: SpecTabProps) {
  const { user } = useUser()
  const [specs, setSpecs] = useState(initialSpecs)
  const [activeSpecId, setActiveSpecId] = useState(specs[0]?.id ?? null)

  const activeSpec = specs.find((s) => s.id === activeSpecId) ?? null

  const handleAddSpec = useCallback(async () => {
    const filePath = `.workhorse/specs/${feature.identifier.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/new-spec.md`
    const content = buildDefaultSpec(
      'New spec',
      feature.identifier,
    )

    const spec = await createSpec({
      featureId: feature.id,
      filePath,
      isNew: true,
      content,
    })

    setSpecs((prev) => [...prev, spec])
    setActiveSpecId(spec.id)
  }, [feature])

  const handleSpecUpdate = useCallback((id: string, content: string) => {
    setSpecs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, content } : s)),
    )
  }, [])

  // If no specs, show empty state with create button
  if (specs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] text-[var(--text-muted)] mb-1">
            No specs yet
          </p>
          <p className="text-[13px] text-[var(--text-faint)] mb-4">
            Start a chat interview first, or create a spec manually.
          </p>
          <button
            onClick={handleAddSpec}
            className="inline-flex items-center justify-center px-[14px] py-[7px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer"
          >
            Create spec
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Chat sidebar */}
      <ChatSidebar
        featureId={feature.id}
        userId={user.id}
        userName={user.displayName}
        messages={messages}
      />

      {/* Spec list (only if multiple specs) */}
      {specs.length > 1 && (
        <SpecListSidebar
          specs={specs}
          activeSpecId={activeSpecId}
          onSelect={setActiveSpecId}
          onAdd={handleAddSpec}
        />
      )}

      {/* Spec document */}
      <div className="flex-1 overflow-y-auto bg-[var(--bg-surface)] flex justify-center">
        {activeSpec ? (
          <SpecEditor
            key={activeSpec.id}
            spec={activeSpec}
            onContentChange={handleSpecUpdate}
          />
        ) : (
          <div className="text-center py-16 text-[var(--text-muted)] text-[13px]">
            Select a spec to edit
          </div>
        )}
      </div>
    </div>
  )
}
