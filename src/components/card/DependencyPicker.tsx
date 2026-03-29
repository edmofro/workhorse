'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { addDependency, removeDependency, searchCards } from '../../lib/actions/dependencies'

interface Dependency {
  id: string
  identifier: string
  title: string
}

interface DependencyPickerProps {
  cardId: string
  currentDeps: Dependency[]
}

export function DependencyPicker({ cardId, currentDeps }: DependencyPickerProps) {
  const [deps, setDeps] = useState(currentDeps)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Dependency[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [, startTransition] = useTransition()

  async function handleSearch(query: string) {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    const results = await searchCards(query, cardId)
    setSearchResults(
      results
        .filter((r) => !deps.some((d) => d.id === r.id))
        .map((r) => ({ id: r.id, identifier: r.identifier, title: r.title })),
    )
  }

  function handleAdd(card: Dependency) {
    startTransition(async () => {
      try {
        await addDependency(cardId, card.id)
        setDeps((prev) => [...prev, card])
        setSearchQuery('')
        setSearchResults([])
        setShowSearch(false)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to add dependency')
      }
    })
  }

  function handleRemove(parentId: string) {
    startTransition(async () => {
      await removeDependency(cardId, parentId)
      setDeps((prev) => prev.filter((d) => d.id !== parentId))
    })
  }

  return (
    <div>
      {/* Current dependencies */}
      {deps.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {deps.map((dep) => (
            <span
              key={dep.id}
              className="inline-flex items-center gap-1 px-2 py-[2px] text-[12px] bg-[var(--bg-inset)] rounded-[var(--radius-default)] text-[var(--text-secondary)]"
            >
              <span className="font-mono text-[var(--text-muted)]">
                {dep.identifier}
              </span>
              {dep.title}
              <button
                onClick={() => handleRemove(dep.id)}
                className="ml-1 text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add dependency */}
      {showSearch ? (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search cards..."
            autoFocus
            className="w-full px-2 py-1 text-[12px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none focus:border-[var(--accent)] transition-[border-color] duration-150"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] shadow-[var(--shadow-md)] z-10 max-h-[200px] overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleAdd(result)}
                  className="w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer"
                >
                  <span className="font-mono text-[var(--text-muted)]">
                    {result.identifier}
                  </span>{' '}
                  {result.title}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              setShowSearch(false)
              setSearchQuery('')
              setSearchResults([])
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="inline-flex items-center gap-1 text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] cursor-pointer transition-colors duration-100"
        >
          <Plus size={10} /> Add dependency
        </button>
      )}
    </div>
  )
}
