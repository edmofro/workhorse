'use client'

import { useState, useEffect, useRef } from 'react'

interface ThinkingIndicatorProps {
  snippet: string | null
}

export function ThinkingIndicator({ snippet }: ThinkingIndicatorProps) {
  const [displaySnippet, setDisplaySnippet] = useState<string | null>(null)
  const [fading, setFading] = useState(false)
  const prevSnippetRef = useRef<string | null>(null)

  useEffect(() => {
    if (!snippet || snippet === prevSnippetRef.current) return
    prevSnippetRef.current = snippet

    // Fade out, swap, fade in
    setFading(true)
    const timer = setTimeout(() => {
      setDisplaySnippet(snippet)
      setFading(false)
    }, 150)

    return () => clearTimeout(timer)
  }, [snippet])

  return (
    <div className="flex flex-col gap-1 pl-[34px]">
      <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
        <span className="thinking-dot" />
        <span>Thinking&hellip;</span>
      </div>
      {displaySnippet && (
        <div
          className={`text-[11px] text-[var(--text-faint)] leading-[1.4] truncate max-w-[500px] select-none transition-opacity duration-150 ${fading ? 'opacity-0' : 'opacity-100'}`}
        >
          {displaySnippet}
        </div>
      )}
    </div>
  )
}
