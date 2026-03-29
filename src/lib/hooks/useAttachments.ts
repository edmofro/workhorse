'use client'

import { useState, useCallback } from 'react'
import type { PendingAttachment, AttachmentData } from '../attachments'
import { uploadAttachment, isImageMimeType } from '../attachments'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
]

export function useAttachments(cardId?: string) {
  const [pending, setPending] = useState<PendingAttachment[]>([])

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const newPending: PendingAttachment[] = []

      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) continue
        if (!ALLOWED_TYPES.includes(file.type)) continue

        const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
        const preview = isImageMimeType(file.type)
          ? URL.createObjectURL(file)
          : undefined

        newPending.push({ id: tempId, file, preview, uploading: true })
      }

      if (newPending.length === 0) return

      setPending((prev) => [...prev, ...newPending])

      // Upload each file
      for (const item of newPending) {
        try {
          const data = await uploadAttachment(item.file, cardId)
          setPending((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, uploaded: data, uploading: false, id: data.id }
                : p,
            ),
          )
        } catch (err) {
          setPending((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? {
                    ...p,
                    uploading: false,
                    error: err instanceof Error ? err.message : 'Upload failed',
                  }
                : p,
            ),
          )
        }
      }
    },
    [cardId],
  )

  const removeAttachment = useCallback((id: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const clear = useCallback(() => {
    setPending((prev) => {
      for (const item of prev) {
        if (item.preview) URL.revokeObjectURL(item.preview)
      }
      return []
    })
  }, [])

  const getUploadedAttachments = useCallback((): AttachmentData[] => {
    return pending
      .filter((p) => p.uploaded)
      .map((p) => p.uploaded!)
  }, [pending])

  return {
    pending,
    addFiles,
    removeAttachment,
    clear,
    getUploadedAttachments,
    hasAttachments: pending.length > 0,
    isUploading: pending.some((p) => p.uploading),
  }
}
