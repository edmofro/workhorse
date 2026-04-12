import { requireUser } from '../../../lib/auth/session'
import { subscribeSessionChanges } from '../../../lib/dbNotifications'
import { prisma } from '../../../lib/prisma'
import { STALE_ACTIVITY_THRESHOLD_MS, clearStaleSessions } from '../../../lib/sessionEvents'

/** Per-user timestamp of last stale cleanup, to avoid repeated writes on reconnect. */
const lastCleanupByUser = new Map<string, number>()
const CLEANUP_DEBOUNCE_MS = 60_000
const CLEANUP_EVICTION_MS = 5 * 60_000

/**
 * GET /api/sidebar-events
 *
 * SSE endpoint that streams real-time sidebar updates to connected clients.
 * Subscribes to Postgres notifications (via LISTEN/NOTIFY) for session changes,
 * queries the updated session, and forwards the event to the client.
 *
 * On connect, sends a `streaming_sessions` event with the IDs of all
 * sessions currently active, so the client starts with correct state.
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

  // Find sessions currently active for this user, excluding stale ones
  const staleThreshold = new Date(Date.now() - STALE_ACTIVITY_THRESHOLD_MS)
  const activeSessions = await prisma.conversationSession.findMany({
    where: {
      userId,
      agentActiveAt: { not: null, gt: staleThreshold },
    },
    select: { id: true },
  })

  // Clean up stale sessions at most once per minute per user
  const now = Date.now()
  const lastCleanup = lastCleanupByUser.get(userId) ?? 0
  if (now - lastCleanup > CLEANUP_DEBOUNCE_MS) {
    lastCleanupByUser.set(userId, now)
    clearStaleSessions({ userId }).catch(() => {})

    // Periodic eviction of stale debounce entries
    if (lastCleanupByUser.size > 100) {
      for (const [uid, ts] of lastCleanupByUser) {
        if (now - ts > CLEANUP_EVICTION_MS) lastCleanupByUser.delete(uid)
      }
    }
  }

  const activeSessionIds = activeSessions.map((s) => s.id)

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(': connected\n\n'))

      // Send initial active sessions snapshot
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: 'streaming_sessions', sessionIds: activeSessionIds })}\n\n`,
        ),
      )

      // Subscribe to DB notifications for this user's session changes
      const unsubscribe = subscribeSessionChanges(userId, async (payload) => {
        try {
          // Query the updated session to get full data for the sidebar
          const session = await prisma.conversationSession.findUnique({
            where: { id: payload.sessionId },
            select: {
              id: true,
              title: true,
              messageCount: true,
              lastMessageAt: true,
              agentActiveAt: true,
              cardId: true,
              card: {
                select: {
                  identifier: true,
                  title: true,
                  status: true,
                  team: {
                    select: {
                      colour: true,
                      project: { select: { name: true } },
                    },
                  },
                },
              },
            },
          })
          if (!session) return

          // Determine event type from changed fields
          const changed = payload.changed
          let type: string = 'session_updated'
          if (changed.includes('agentActiveAt')) {
            type = session.agentActiveAt ? 'streaming_start' : 'streaming_stop'
          }

          const event = {
            type,
            userId,
            session: {
              id: session.id,
              title: session.title,
              messageCount: session.messageCount,
              lastMessageAt: session.lastMessageAt.toISOString(),
              cardId: session.cardId,
              cardIdentifier: session.card?.identifier ?? null,
              cardTitle: session.card?.title ?? null,
              cardStatus: session.card?.status ?? null,
              teamColour: session.card?.team.colour ?? null,
              projectName: session.card?.team.project.name ?? null,
            },
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          )
        } catch {
          // Query failed or controller closed — ignore
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
