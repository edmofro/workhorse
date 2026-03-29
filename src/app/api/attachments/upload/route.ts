import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
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

export async function POST(request: NextRequest) {
  await requireUser()

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

  // Create attachment record
  const attachment = await prisma.attachment.create({
    data: {
      cardId: cardId || null,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      storagePath: '', // Set after we know the ID
    },
  })

  // Save file to disk
  const dir = path.join(ATTACHMENTS_DIR, attachment.id)
  await mkdir(dir, { recursive: true })
  const filePath = path.join(dir, file.name)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  // Update storage path
  await prisma.attachment.update({
    where: { id: attachment.id },
    data: { storagePath: filePath },
  })

  return NextResponse.json({
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    fileSize: attachment.fileSize,
    url: `/api/attachments/${attachment.id}`,
  })
}
