'use client'

import { useState, useRef, useCallback } from 'react'
import { AttachmentButton } from './AttachmentButton'
import { AttachmentPreview } from './AttachmentPreview'
import type { PendingAttachment } from '../../lib/attachments'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  compact?: boolean
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
  pendingAttachments,
  onAddFiles,
  onRemoveAttachment,
  isUploading,
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    if ((!value.trim() && (!pendingAttachments || pendingAttachments.length === 0)) || disabled || isUploading) return
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
  const canSend = (value.trim() || hasAttachments) && !disabled && !isUploading

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
          style={{ padding: '4px 4px 4px 12px' }}
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
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className="px-3 py-[6px] bg-[var(--accent)] text-white rounded-[var(--radius-default)] text-xs font-medium cursor-pointer disabled:opacity-40 shrink-0"
          >
            Send
          </button>
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
        style={{ padding: '6px 6px 6px 16px' }}
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
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-[var(--radius-default)] text-xs font-medium cursor-pointer disabled:opacity-40 shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  )
}
