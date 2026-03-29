'use client'

import { useRef } from 'react'
import { Paperclip } from 'lucide-react'

interface AttachmentButtonProps {
  onFiles: (files: FileList) => void
  disabled?: boolean
  compact?: boolean
}

const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml,application/pdf'

export function AttachmentButton({ onFiles, disabled, compact }: AttachmentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleClick() {
    inputRef.current?.click()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      onFiles(e.target.files)
      // Reset so the same file can be selected again
      e.target.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`shrink-0 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-100 cursor-pointer disabled:opacity-40 disabled:cursor-default ${compact ? 'p-1' : 'p-1.5'}`}
        title="Attach file"
      >
        <Paperclip size={compact ? 14 : 16} />
      </button>
    </>
  )
}
