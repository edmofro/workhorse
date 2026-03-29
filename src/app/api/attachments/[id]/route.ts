import { NextRequest } from 'next/server'
import { createReadStream, existsSync } from 'fs'
import { stat } from 'fs/promises'
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

  // Authorisation: verify user has access to the card this attachment belongs to
  if (attachment.cardId) {
    const card = await prisma.card.findUnique({
      where: { id: attachment.cardId },
      include: { team: true },
    })
    if (!card) {
      return new Response('Not found', { status: 404 })
    }
  }

  // Verify file exists
  if (!existsSync(attachment.storagePath)) {
    return new Response('File not found on disk', { status: 404 })
  }

  try {
    const fileStat = await stat(attachment.storagePath)

    // Sanitise filename for Content-Disposition header (RFC 5987)
    const safeFileName = encodeURIComponent(attachment.fileName).replace(/'/g, '%27')

    // SVG files can contain scripts — force download instead of inline rendering
    const isSvg = attachment.mimeType === 'image/svg+xml'
    const disposition = isSvg ? 'attachment' : 'inline'

    const headers: Record<string, string> = {
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `${disposition}; filename*=UTF-8''${safeFileName}`,
      'Content-Length': String(fileStat.size),
      'Cache-Control': 'private, max-age=86400',
    }

    // Add CSP sandbox for SVG to prevent script execution
    if (isSvg) {
      headers['Content-Security-Policy'] = 'sandbox'
    }

    // Stream the file instead of loading it all into memory
    const nodeStream = createReadStream(attachment.storagePath)
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk) => {
          controller.enqueue(chunk)
        })
        nodeStream.on('end', () => {
          controller.close()
        })
        nodeStream.on('error', (err) => {
          controller.error(err)
        })
      },
      cancel() {
        nodeStream.destroy()
      },
    })

    return new Response(webStream, { headers })
  } catch {
    return new Response('Failed to read file', { status: 500 })
  }
}
