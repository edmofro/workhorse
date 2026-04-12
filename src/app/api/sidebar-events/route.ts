import { requireUser } from '../../../lib/auth/session'
import { subscribe } from '../../../lib/sidebarEvents'
import { prisma } from '../../../lib/prisma'
import { STALE_STREAMING_THRESHOLD_MS } from '../../../lib/sessionEvents'

/** Per-user timestamp of last stale cleanup, to avoid repeated writes on reconnect. */
const lastCleanupByUser = new Map<string, number>()
const CLEANUP_DEBOUNCE_MS = 60_000

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
  const staleThreshold = new Date(Date.now() - STALE_STREAMING_THRESHOLD_MS)
  const streamingSessions = await prisma.conversationSession.findMany({
    where: {
      userId,
      streamingStartedAt: { not: null, gt: staleThreshold },
    },
    select: { id: true },
  })

  // Clean up stale streaming sessions at most once per minute per user
  const lastCleanup = lastCleanupByUser.get(userId) ?? 0
  if (Date.now() - lastCleanup > CLEANUP_DEBOUNCE_MS) {
    lastCleanupByUser.set(userId, Date.now())
    prisma.conversationSession.updateMany({
      where: {
        userId,
        streamingStartedAt: { not: null, lte: staleThreshold },
      },
      data: { streamingStartedAt: null },
    }).catch(() => {})
  }

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
