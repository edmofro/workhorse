'use client'

import { X, FileText, Loader2 } from 'lucide-react'
import type { PendingAttachment, AttachmentData } from '../../lib/attachments'
import { isImageMimeType, formatFileSize } from '../../lib/attachments'

interface AttachmentPreviewProps {
  /** Pending attachments (with upload state) */
  pending?: PendingAttachment[]
  /** Already-saved attachments (from DB) */
  saved?: AttachmentData[]
  onRemovePending?: (id: string) => void
  compact?: boolean
}

export function AttachmentPreview({
  pending = [],
  saved = [],
  onRemovePending,
  compact = false,
}: AttachmentPreviewProps) {
  if (pending.length === 0 && saved.length === 0) return null

  const thumbSize = compact ? 48 : 64

  return (
    <div className="flex flex-wrap gap-2">
      {/* Saved attachments */}
      {saved.map((att) => (
        <AttachmentThumb
          key={att.id}
          fileName={att.fileName}
          mimeType={att.mimeType}
          fileSize={att.fileSize}
          url={att.url}
          size={thumbSize}
        />
      ))}

      {/* Pending attachments */}
      {pending.map((att) => (
        <div key={att.id} className="relative group">
          <AttachmentThumb
            fileName={att.file.name}
            mimeType={att.file.type}
            fileSize={att.file.size}
            preview={att.preview}
            url={att.uploaded?.url}
            uploading={att.uploading}
            error={att.error}
            size={thumbSize}
          />
          {onRemovePending && (
            <button
              type="button"
              onClick={() => onRemovePending(att.id)}
              className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-100 cursor-pointer hover:border-[var(--accent)]"
            >
              <X size={10} className="text-[var(--text-muted)]" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

function AttachmentThumb({
  fileName,
  mimeType,
  fileSize,
  preview,
  url,
  uploading,
  error,
  size,
}: {
  fileName: string
  mimeType: string
  fileSize: number
  preview?: string
  url?: string
  uploading?: boolean
  error?: string
  size: number
}) {
  const isImage = isImageMimeType(mimeType)
  const src = preview ?? url

  if (isImage && src) {
    return (
      <a
        href={url ?? src}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-[var(--radius-default)] overflow-hidden border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-[border-color] duration-100"
        style={{ width: size, height: size }}
        title={`${fileName} (${formatFileSize(fileSize)})`}
      >
        <div className="relative w-full h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={fileName}
            className="w-full h-full object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-[rgba(28,25,23,0.3)] flex items-center justify-center">
              <Loader2 size={16} className="text-white animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 bg-[rgba(194,65,12,0.1)] flex items-center justify-center">
              <span className="text-[11px] text-[var(--accent)] font-medium">Error</span>
            </div>
          )}
        </div>
      </a>
    )
  }

  return (
    <div
      className="flex items-center justify-center rounded-[var(--radius-default)] border border-[var(--border-subtle)] bg-[var(--bg-inset)]"
      style={{ width: size, height: size }}
      title={`${fileName} (${formatFileSize(fileSize)})`}
    >
      {uploading ? (
        <Loader2 size={16} className="text-[var(--text-muted)] animate-spin" />
      ) : (
        <FileText size={16} className="text-[var(--text-muted)]" />
      )}
    </div>
  )
}

/** Display attachments inline in a message (read-only, no remove) */
export function MessageAttachments({ attachments }: { attachments: AttachmentData[] }) {
  if (attachments.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {attachments.map((att) => (
        <AttachmentThumb
          key={att.id}
          fileName={att.fileName}
          mimeType={att.mimeType}
          fileSize={att.fileSize}
          url={att.url}
          size={64}
        />
      ))}
    </div>
  )
}
