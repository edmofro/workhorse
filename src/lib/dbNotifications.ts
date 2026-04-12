/**
 * Postgres LISTEN/NOTIFY fan-out for real-time session change events.
 *
 * A single long-lived connection (outside Prisma's pool) listens for
 * `session_changes` notifications emitted by the DB trigger on
 * ConversationSession. Notifications are fanned out to registered
 * per-userId listeners so SSE endpoints can push updates to clients.
 */

import pg from 'pg'

export interface SessionChangePayload {
  sessionId: string
  userId: string
  changed: string[]
}

type Listener = (payload: SessionChangePayload) => void

/** Per-userId listener sets. */
const listenersByUser = new Map<string, Set<Listener>>()

let client: pg.Client | null = null
let connecting = false
let connected = false

/**
 * Initialise the LISTEN connection (idempotent).
 * Called lazily on first subscribe.
 */
async function ensureListening(): Promise<void> {
  if (connected || connecting) return
  if (!process.env.DATABASE_URL) return

  connecting = true
  try {
    client = new pg.Client({ connectionString: process.env.DATABASE_URL })
    await client.connect()
    await client.query('LISTEN session_changes')

    client.on('notification', (msg) => {
      if (msg.channel !== 'session_changes' || !msg.payload) return
      try {
        const payload = JSON.parse(msg.payload) as SessionChangePayload
        const listeners = listenersByUser.get(payload.userId)
        if (!listeners) return
        for (const listener of listeners) {
          try {
            listener(payload)
          } catch {
            // Don't let one broken listener affect others
          }
        }
      } catch {
        // Malformed payload — skip
      }
    })

    client.on('error', (err) => {
      console.error('[dbNotifications] Connection error:', err.message)
      connected = false
      client = null
      // Attempt reconnect after a brief delay
      setTimeout(() => {
        connecting = false
        if (listenersByUser.size > 0) {
          ensureListening().catch(() => {})
        }
      }, 3000)
    })

    connected = true
  } catch (err) {
    console.error('[dbNotifications] Failed to connect:', err)
    client = null
  } finally {
    connecting = false
  }
}

/**
 * Subscribe to session change notifications for a specific user.
 * Returns an unsubscribe function.
 */
export function subscribeSessionChanges(
  userId: string,
  listener: Listener,
): () => void {
  let listeners = listenersByUser.get(userId)
  if (!listeners) {
    listeners = new Set()
    listenersByUser.set(userId, listeners)
  }
  listeners.add(listener)

  // Start LISTEN connection if needed
  ensureListening().catch(() => {})

  return () => {
    listeners!.delete(listener)
    if (listeners!.size === 0) {
      listenersByUser.delete(userId)
    }
  }
}
