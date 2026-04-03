import { requireUser } from '../../../lib/auth/session'
import { subscribe } from '../../../lib/sidebarEvents'

/**
 * GET /api/sidebar-events
 *
 * SSE endpoint that streams real-time sidebar updates (new sessions,
 * title changes, streaming status) to connected clients.
 * Events are scoped to the authenticated user.
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

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(': connected\n\n'))

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
