import { requireUser } from '../../../../../lib/auth/session'
import { prisma } from '../../../../../lib/prisma'
import { subscribe, isActive } from '../../../../../lib/sessionEvents'
import { NextRequest } from 'next/server'

const STALE_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

/**
 * GET /api/sessions/[id]/events
 *
 * SSE endpoint for subscribing to a session's live event stream.
 * If the session is actively streaming, replays recent events then
 * streams live. If idle or stale, sends a single `idle` event and closes.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let user
  try {
    user = await requireUser()
  } catch {
    return new Response('Unauthorised', { status: 401 })
  }

  const { id: sessionId } = await params

  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, streamingStartedAt: true },
  })

  if (!session || session.userId !== user.id) {
    return new Response('Not found', { status: 404 })
  }

  // Check for stale streaming — clear if older than 10 minutes
  if (session.streamingStartedAt) {
    const age = Date.now() - session.streamingStartedAt.getTime()
    if (age > STALE_THRESHOLD_MS) {
      await prisma.conversationSession.update({
        where: { id: sessionId },
        data: { streamingStartedAt: null },
      })
      session.streamingStartedAt = null
    }
  }

  // If not streaming or no active channel, return idle
  if (!session.streamingStartedAt || !isActive(sessionId)) {
    const encoder = new TextEncoder()
    return new Response(
      encoder.encode(`data: ${JSON.stringify({ type: 'status', status: 'idle' })}\n\n`),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      },
    )
  }

  // Stream live events
  const encoder = new TextEncoder()
  let cleanup: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      // Send streaming status
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'status', status: 'streaming' })}\n\n`),
      )

      const unsubscribe = subscribe(sessionId, (event) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          unsubscribe()
        }
      })

      // When the agent finishes, the channel is closed and no more events
      // arrive. We detect completion via a 'result' event or the channel
      // closing. Use a periodic check as a fallback.
      const checkAlive = setInterval(() => {
        if (!isActive(sessionId)) {
          clearInterval(checkAlive)
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', status: 'idle' })}\n\n`))
            controller.close()
          } catch {
            // Already closed
          }
        }
      }, 2000)

      cleanup = () => {
        clearInterval(checkAlive)
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
