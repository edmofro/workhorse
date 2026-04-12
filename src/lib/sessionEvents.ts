/**
 * Per-session event pub/sub with bounded replay buffer.
 *
 * The agent-session route publishes every SSE event into the session's
 * channel. Clients that connect mid-stream (e.g. navigating back to a
 * conversation) receive the last N events as replay, then live events.
 */

import { prisma } from './prisma'

const REPLAY_BUFFER_SIZE = 50

/** Sessions with agentActiveAt older than this are considered stale. */
export const STALE_ACTIVITY_THRESHOLD_MS = 10 * 60 * 1000 // 10 minutes

type EventListener = (event: Record<string, unknown>) => void

interface SessionChannel {
  listeners: Set<EventListener>
  /** Circular buffer: events stored at indices, head advances on overflow. */
  buffer: Record<string, unknown>[]
  head: number
  count: number
}

const channels = new Map<string, SessionChannel>()

function getOrCreate(sessionId: string): SessionChannel {
  let channel = channels.get(sessionId)
  if (!channel) {
    channel = { listeners: new Set(), buffer: new Array(REPLAY_BUFFER_SIZE), head: 0, count: 0 }
    channels.set(sessionId, channel)
  }
  return channel
}

/** Read replay events from the circular buffer in insertion order. */
function replayEvents(channel: SessionChannel): Record<string, unknown>[] {
  const events: Record<string, unknown>[] = []
  const start = channel.count < REPLAY_BUFFER_SIZE
    ? 0
    : channel.head
  const len = Math.min(channel.count, REPLAY_BUFFER_SIZE)
  for (let i = 0; i < len; i++) {
    events.push(channel.buffer[(start + i) % REPLAY_BUFFER_SIZE])
  }
  return events
}

/** Publish an event to all subscribers of a session and append to replay buffer. */
export function publish(sessionId: string, event: Record<string, unknown>) {
  const channel = getOrCreate(sessionId)

  // Circular buffer write
  const idx = (channel.head + channel.count) % REPLAY_BUFFER_SIZE
  channel.buffer[idx] = event
  if (channel.count < REPLAY_BUFFER_SIZE) {
    channel.count++
  } else {
    channel.head = (channel.head + 1) % REPLAY_BUFFER_SIZE
  }

  for (const listener of channel.listeners) {
    try {
      listener(event)
    } catch {
      // Don't let one broken listener affect others
    }
  }
}

/**
 * Subscribe to a session's event stream.
 * The callback receives replay events immediately (synchronously),
 * then live events as they arrive.
 * Returns an unsubscribe function.
 */
export function subscribe(
  sessionId: string,
  listener: EventListener,
): () => void {
  const channel = getOrCreate(sessionId)

  // Send replay buffer
  for (const event of replayEvents(channel)) {
    try {
      listener(event)
    } catch {
      // Skip
    }
  }

  channel.listeners.add(listener)
  return () => {
    channel.listeners.delete(listener)
    // Clean up empty channels with no buffered events
    if (channel.listeners.size === 0 && channel.count === 0) {
      channels.delete(sessionId)
    }
  }
}

/**
 * Close the channel for a session (called when streaming ends).
 * Sends a sentinel event to all listeners before removing the channel,
 * so subscribers can clean up without polling.
 */
export function close(sessionId: string) {
  const channel = channels.get(sessionId)
  if (channel) {
    const sentinel: Record<string, unknown> = { type: 'channel_closed' }
    for (const listener of channel.listeners) {
      try {
        listener(sentinel)
      } catch {
        // Ignore
      }
    }
  }
  channels.delete(sessionId)
}

/** Check if a session has an active channel (created by publish or subscribe). */
export function isActive(sessionId: string): boolean {
  return channels.has(sessionId)
}

// ── Stale activity cleanup ──

/**
 * Clear stale agentActiveAt flags. Accepts an optional scope:
 * - no args: clears all stale sessions (for startup cleanup)
 * - { userId }: clears stale sessions for a specific user
 * - { sessionId }: clears a single stale session
 *
 * Returns the number of sessions cleared.
 */
export async function clearStaleSessions(
  scope?: { userId?: string; sessionId?: string },
): Promise<number> {
  const staleThreshold = new Date(Date.now() - STALE_ACTIVITY_THRESHOLD_MS)

  if (scope?.sessionId) {
    const result = await prisma.conversationSession.updateMany({
      where: {
        id: scope.sessionId,
        agentActiveAt: { not: null, lte: staleThreshold },
      },
      data: { agentActiveAt: null },
    })
    return result.count
  }

  const where: Record<string, unknown> = {
    agentActiveAt: { not: null, lte: staleThreshold },
  }
  if (scope?.userId) {
    where.userId = scope.userId
  }

  const result = await prisma.conversationSession.updateMany({
    where,
    data: { agentActiveAt: null },
  })
  return result.count
}
