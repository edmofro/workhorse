/** Shared attachment types and utilities */

export interface AttachmentData {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
  url: string
}

/** Pending attachment (client-side, before or after upload) */
export interface PendingAttachment {
  id: string // Temporary client ID or server ID after upload
  file: File
  preview?: string // Object URL for image preview
  uploaded?: AttachmentData // Set after successful upload
  uploading?: boolean
  error?: string
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function uploadAttachment(
  file: File,
  cardId?: string,
): Promise<AttachmentData> {
  const formData = new FormData()
  formData.append('file', file)
  if (cardId) formData.append('cardId', cardId)

  const res = await fetch('/api/attachments/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error ?? 'Upload failed')
  }

  return res.json()
}
