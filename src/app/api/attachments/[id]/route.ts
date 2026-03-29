import { NextRequest } from 'next/server'
import { readFile } from 'fs/promises'
import { prisma } from '../../../../lib/prisma'
import { requireUser } from '../../../../lib/auth/session'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser()

  const { id } = await params
  const attachment = await prisma.attachment.findUnique({ where: { id } })

  if (!attachment) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const data = await readFile(attachment.storagePath)
    return new Response(data, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `inline; filename="${attachment.fileName}"`,
        'Cache-Control': 'private, max-age=86400',
      },
    })
  } catch {
    return new Response('File not found on disk', { status: 404 })
  }
}
