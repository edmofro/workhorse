import { requireUser } from '../../../lib/auth/session'
import { subscribe } from '../../../lib/sidebarEvents'
import { prisma } from '../../../lib/prisma'

const STALE_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

/**
 * GET /api/sidebar-events
 *
 * SSE endpoint that streams real-time sidebar updates (new sessions,
 * title changes, streaming status) to connected clients.
 * Events are scoped to the authenticated user.
 *
 * On connect, sends a `streaming_sessions` event with the IDs of all
 * sessions currently streaming, so the client starts with correct state.
 */
export async function GET() {
  let user
  try {
    user = await requireUser()
  } catch {
    return new Response('Unauthorised', { status: 401 })
  }

  const userId = user.id
  const encoder = new TextEncoder()
  let cleanup: (() => void) | null = null

  // Find sessions currently streaming for this user, excluding stale ones
  const staleThreshold = new Date(Date.now() - STALE_THRESHOLD_MS)
  const streamingSessions = await prisma.conversationSession.findMany({
    where: {
      userId,
      streamingStartedAt: { not: null, gt: staleThreshold },
    },
    select: { id: true },
  })

  // Clean up any stale streaming sessions in the background
  prisma.conversationSession.updateMany({
    where: {
      userId,
      streamingStartedAt: { not: null, lte: staleThreshold },
    },
    data: { streamingStartedAt: null },
  }).catch(() => {})

  const streamingSessionIds = streamingSessions.map((s) => s.id)

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(': connected\n\n'))

      // Send initial streaming sessions snapshot
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'streaming_sessions', sessionIds: streamingSessionIds })}\n\n`,
        ),
      )

      const unsubscribe = subscribe((event) => {
        if (event.userId !== userId) return
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          )
        } catch {
          unsubscribe()
        }
      })

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(keepalive)
          unsubscribe()
        }
      }, 30_000)

      cleanup = () => {
        clearInterval(keepalive)
        unsubscribe()
      }
    },
    cancel() {
      cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
