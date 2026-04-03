'use client'

import { useState, useRef, useCallback } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { AttachmentButton } from './AttachmentButton'
import { AttachmentPreview } from './AttachmentPreview'
import type { PendingAttachment } from '../../lib/attachments'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  compact?: boolean
  /** Whether the agent is currently streaming a response */
  isStreaming?: boolean
  /** Called when the user clicks the stop button */
  onStop?: () => void
  /** Pending attachments managed by parent */
  pendingAttachments?: PendingAttachment[]
  /** Called when user selects files */
  onAddFiles?: (files: FileList) => void
  /** Called when user removes a pending attachment */
  onRemoveAttachment?: (id: string) => void
  /** Whether any attachments are currently uploading */
  isUploading?: boolean
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Continue the conversation...',
  compact = false,
  isStreaming = false,
  onStop,
  pendingAttachments,
  onAddFiles,
  onRemoveAttachment,
  isUploading,
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    const hasAttachments = pendingAttachments && pendingAttachments.length > 0
    if ((!value.trim() && !hasAttachments) || disabled || isUploading) return
    onSend(value.trim())
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, isUploading, pendingAttachments, onSend])

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

  function handlePaste(e: React.ClipboardEvent) {
    if (!onAddFiles) return
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null)

    if (files.length > 0) {
      const dt = new DataTransfer()
      for (const f of files) dt.items.add(f)
      onAddFiles(dt.files)
    }
  }

  const hasAttachments = pendingAttachments && pendingAttachments.length > 0
  const hasContent = !!(value.trim() || hasAttachments)
  const canSend = hasContent && !disabled && !isUploading

  // Icon button shared styles
  const iconBtnBase = 'flex items-center justify-center shrink-0 rounded-[var(--radius-default)] transition-[background,opacity] duration-100 cursor-pointer'

  const sendButton = (size: 'compact' | 'full') => {
    const px = size === 'compact' ? 'w-[28px] h-[28px]' : 'w-[32px] h-[32px]'
    const iconSize = size === 'compact' ? 14 : 16
    return (
      <button
        onClick={handleSubmit}
        disabled={!canSend}
        className={`${iconBtnBase} ${px} bg-[var(--accent)] text-white disabled:opacity-35`}
        title="Send"
      >
        <ArrowUp size={iconSize} strokeWidth={2.5} />
      </button>
    )
  }

  const stopButton = (size: 'compact' | 'full') => {
    const px = size === 'compact' ? 'w-[28px] h-[28px]' : 'w-[32px] h-[32px]'
    const iconSize = size === 'compact' ? 12 : 14
    return (
      <button
        onClick={onStop}
        className={`${iconBtnBase} ${px} bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]`}
        title="Stop"
      >
        <Square size={iconSize} fill="currentColor" />
      </button>
    )
  }

  const renderButtons = (size: 'compact' | 'full') => {
    if (isStreaming) {
      // State 3 or 4: show stop, and send if there's content
      return (
        <>
          {stopButton(size)}
          {hasContent && sendButton(size)}
        </>
      )
    }
    // State 1 or 2: just the send button
    return sendButton(size)
  }

  if (compact) {
    return (
      <div className="border-t border-[var(--border-subtle)] shrink-0" style={{ padding: '12px 16px' }}>
        {hasAttachments && (
          <div className="mb-2">
            <AttachmentPreview
              pending={pendingAttachments}
              onRemovePending={onRemoveAttachment}
              compact
            />
          </div>
        )}
        <div className="flex items-end bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-150 focus-within:border-[var(--accent)] focus-within:shadow-[var(--shadow-input-focus)]"
          style={{ padding: '4px 4px 4px 12px', gap: '4px' }}
        >
          {onAddFiles && (
            <AttachmentButton onFiles={onAddFiles} disabled={disabled} compact />
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Ask to refine..."
            rows={1}
            className="flex-1 border-none bg-transparent outline-none resize-none text-[13px] leading-[1.5] min-h-[24px]"
            style={{ padding: '6px 0', maxHeight: '160px', overflowY: 'auto' }}
          />
          {renderButtons('compact')}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full shrink-0" style={{ maxWidth: '680px', padding: '12px 24px 28px' }}>
      {hasAttachments && (
        <div className="mb-3">
          <AttachmentPreview
            pending={pendingAttachments}
            onRemovePending={onRemoveAttachment}
          />
        </div>
      )}
      <div className="flex items-end bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-150 focus-within:border-[var(--accent)] focus-within:shadow-[var(--shadow-input-focus)]"
        style={{ padding: '6px 6px 6px 16px', gap: '4px' }}
      >
        {onAddFiles && (
          <AttachmentButton onFiles={onAddFiles} disabled={disabled} />
        )}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="flex-1 border-none bg-transparent outline-none resize-none text-[14px] leading-[1.5] min-h-[24px] placeholder:text-[var(--text-faint)]"
          style={{ padding: '8px 0', maxHeight: '200px', overflowY: 'auto' }}
        />
        {renderButtons('full')}
      </div>
    </div>
  )
}
