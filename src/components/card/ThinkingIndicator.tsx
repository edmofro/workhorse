'use client'

import { useState, useEffect, useRef } from 'react'

interface ThinkingIndicatorProps {
  snippet: string | null
  verb?: string
}

export function ThinkingIndicator({ snippet, verb = 'Thinking...' }: ThinkingIndicatorProps) {
  const [displaySnippet, setDisplaySnippet] = useState<string | null>(null)
  const [snippetFading, setSnippetFading] = useState(false)
  const prevSnippetRef = useRef<string | null>(null)

  const [displayVerb, setDisplayVerb] = useState(verb)
  const [verbFading, setVerbFading] = useState(false)
  const prevVerbRef = useRef(verb)

  useEffect(() => {
    if (verb === prevVerbRef.current) return
    prevVerbRef.current = verb

    // Fade out, swap, fade in (120ms)
    setVerbFading(true)
    const timer = setTimeout(() => {
      setDisplayVerb(verb)
      setVerbFading(false)
    }, 120)

    return () => clearTimeout(timer)
  }, [verb])

  useEffect(() => {
    if (!snippet || snippet === prevSnippetRef.current) return
    prevSnippetRef.current = snippet

    // Fade out, swap, fade in (150ms)
    setSnippetFading(true)
    const timer = setTimeout(() => {
      setDisplaySnippet(snippet)
      setSnippetFading(false)
    }, 150)

    return () => clearTimeout(timer)
  }, [snippet])

  return (
    <div className="flex flex-col gap-1 pl-[34px]">
      <div className="flex items-center gap-[10px]">
        <span className="thinking-dot" />
        <span
          className={`text-[13px] font-[450] text-[var(--text-muted)] transition-opacity duration-[120ms] ${verbFading ? 'opacity-0' : 'opacity-100'}`}
        >
          {displayVerb}
        </span>
      </div>
      {displaySnippet && (
        <div
          className={`text-[11px] text-[var(--text-faint)] leading-[1.4] truncate max-w-[500px] select-none pl-[17px] transition-opacity duration-150 ${snippetFading ? 'opacity-0' : 'opacity-100'}`}
        >
          {displaySnippet}
        </div>
      )}
    </div>
  )
}
