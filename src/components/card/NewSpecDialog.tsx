'use client'

import { useState } from 'react'

interface NewSpecDialogProps {
  cardIdentifier: string
  existingAreas: string[]
  onConfirm: (title: string, area: string) => void
  onCancel: () => void
  isCreating: boolean
}

export function NewSpecDialog({
  cardIdentifier,
  existingAreas,
  onConfirm,
  onCancel,
  isCreating,
}: NewSpecDialogProps) {
  const [title, setTitle] = useState('')
  const [area, setArea] = useState(existingAreas[0] ?? 'general')
  const [customArea, setCustomArea] = useState('')
  const [useCustomArea, setUseCustomArea] = useState(existingAreas.length === 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const resolvedArea = useCustomArea ? customArea.trim() : area
    if (!title.trim() || !resolvedArea) return
    onConfirm(title.trim(), resolvedArea)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-full max-w-[440px] bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] p-6">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-1">
            New spec
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mb-4">
            For {cardIdentifier}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] text-[var(--text-muted)] mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                placeholder="e.g. Patient allergy display"
                className="w-full px-3 py-2 text-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] placeholder:text-[var(--text-faint)]"
              />
            </div>

            <div>
              <label className="block text-[12px] text-[var(--text-muted)] mb-1">
                Area
              </label>
              {existingAreas.length > 0 && !useCustomArea ? (
                <div className="space-y-2">
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full px-3 py-2 text-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] transition-[border-color,box-shadow] duration-150"
                  >
                    {existingAreas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setUseCustomArea(true)}
                    className="text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer transition-colors duration-100"
                  >
                    New area...
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    placeholder="e.g. patients, scheduling"
                    className="w-full px-3 py-2 text-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] placeholder:text-[var(--text-faint)]"
                  />
                  {existingAreas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUseCustomArea(false)}
                      className="text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer transition-colors duration-100"
                    >
                      Choose existing area
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !title.trim() ||
                  (!useCustomArea ? !area : !customArea.trim()) ||
                  isCreating
                }
                className="px-3 py-[6px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-100 cursor-pointer disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create spec'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
