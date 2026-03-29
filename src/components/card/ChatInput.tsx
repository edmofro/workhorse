'use client'

import { useState, useRef, useCallback } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  compact?: boolean
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Continue the conversation...',
  compact = false,
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, onSend])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  if (compact) {
    return (
      <div className="border-t border-[var(--border-subtle)] shrink-0" style={{ padding: '12px 16px' }}>
        <div className="flex items-end bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-150 focus-within:border-[var(--accent)] focus-within:shadow-[var(--shadow-input-focus)]"
          style={{ padding: '4px 4px 4px 12px' }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask to refine..."
            rows={1}
            className="flex-1 border-none bg-transparent outline-none resize-none text-[13px] leading-[1.5] min-h-[24px]"
            style={{ padding: '6px 0' }}
          />
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="px-3 py-[6px] bg-[var(--accent)] text-white rounded-[var(--radius-default)] text-xs font-medium cursor-pointer disabled:opacity-40 shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full shrink-0" style={{ maxWidth: '680px', padding: '0 24px 28px' }}>
      <div className="flex items-end bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-150 focus-within:border-[var(--accent)] focus-within:shadow-[var(--shadow-input-focus)]"
        style={{ padding: '6px 6px 6px 16px' }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="flex-1 border-none bg-transparent outline-none resize-none text-[14px] leading-[1.5] min-h-[24px] placeholder:text-[var(--text-faint)]"
          style={{ padding: '8px 0' }}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-[var(--radius-default)] text-xs font-medium cursor-pointer disabled:opacity-40 shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  )
}
