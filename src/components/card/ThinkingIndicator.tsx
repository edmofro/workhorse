'use client'

interface ThinkingIndicatorProps {
  snippet: string | null
}

export function ThinkingIndicator({ snippet }: ThinkingIndicatorProps) {
  return (
    <div className="flex flex-col gap-1 pl-[34px]">
      <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
        <span className="thinking-dot" />
        <span>Thinking&hellip;</span>
      </div>
      {snippet && (
        <div className="text-[11px] text-[var(--text-faint)] leading-[1.4] truncate max-w-[500px] select-none">
          {snippet}
        </div>
      )}
    </div>
  )
}
