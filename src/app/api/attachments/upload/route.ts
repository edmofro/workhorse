import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import crypto from 'crypto'
import path from 'path'
import { prisma } from '../../../../lib/prisma'
import { requireUser } from '../../../../lib/auth/session'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
])

const ATTACHMENTS_DIR = process.env.ATTACHMENTS_DIR ?? '/data/attachments'

/** Magic byte signatures for allowed file types */
const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF....WEBP
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
]

function detectMimeType(buffer: Buffer): string | null {
  for (const sig of MAGIC_BYTES) {
    const offset = sig.offset ?? 0
    if (buffer.length < offset + sig.bytes.length) continue
    const match = sig.bytes.every((b, i) => buffer[offset + i] === b)
    if (match) {
      // WebP needs additional check for WEBP at offset 8
      if (sig.mime === 'image/webp') {
        if (buffer.length >= 12 && buffer.toString('ascii', 8, 12) === 'WEBP') {
          return 'image/webp'
        }
        continue
      }
      return sig.mime
    }
  }

  // SVG: check for XML declaration or SVG tag, tolerating BOM and whitespace
  const head = buffer.subarray(0, 512).toString('utf8')
  if (/^(\xef\xbb\xbf)?\s*(<?xml\b|<svg\b)/i.test(head)) {
    return 'image/svg+xml'
  }

  return null
}

export async function POST(request: NextRequest) {
  const user = await requireUser()

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const cardId = formData.get('cardId') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Allowed: PNG, JPG, GIF, WebP, SVG, PDF' },
      { status: 400 },
    )
  }

  // If a cardId is provided, verify the user has access to the card
  if (cardId) {
    const card = await prisma.card.findUnique({ where: { id: cardId } })
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Validate actual file content matches claimed MIME type
  const detectedMime = detectMimeType(buffer)
  if (!detectedMime) {
    return NextResponse.json(
      { error: 'Could not verify file content — upload rejected' },
      { status: 400 },
    )
  }
  if (detectedMime !== file.type) {
    return NextResponse.json(
      { error: 'File content does not match declared type' },
      { status: 400 },
    )
  }

  // Sanitise filename: strip directory components and dangerous characters
  const safeName = path.basename(file.name).replace(/[^\w.\-]/g, '_')

  // Generate ID upfront so we can compute the storage path before creating the record
  const id = crypto.randomUUID()
  const dir = path.join(ATTACHMENTS_DIR, id)
  const filePath = path.join(dir, safeName)

  // Write file to disk first — only create DB record on success
  try {
    await mkdir(dir, { recursive: true })
    await writeFile(filePath, buffer)
  } catch {
    return NextResponse.json(
      { error: 'Failed to store file' },
      { status: 500 },
    )
  }

  // Create DB record with storage path already set
  let attachment
  try {
    attachment = await prisma.attachment.create({
      data: {
        id,
        cardId: cardId || null,
        fileName: safeName,
        mimeType: file.type,
        fileSize: file.size,
        storagePath: filePath,
        uploadedById: user.id,
      },
    })
  } catch {
    // Clean up the file if DB creation fails
    await unlink(filePath).catch(() => {})
    return NextResponse.json(
      { error: 'Failed to create attachment record' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    fileSize: attachment.fileSize,
    url: `/api/attachments/${attachment.id}`,
  })
}
