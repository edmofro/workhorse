/**
 * Per-session event pub/sub with bounded replay buffer.
 *
 * The agent-session route publishes every SSE event into the session's
 * channel. Clients that connect mid-stream (e.g. navigating back to a
 * conversation) receive the last N events as replay, then live events.
 */

const REPLAY_BUFFER_SIZE = 50

interface SessionChannel {
  listeners: Set<(event: Record<string, unknown>) => void>
  buffer: Record<string, unknown>[]
}

const channels = new Map<string, SessionChannel>()

function getOrCreate(sessionId: string): SessionChannel {
  let channel = channels.get(sessionId)
  if (!channel) {
    channel = { listeners: new Set(), buffer: [] }
    channels.set(sessionId, channel)
  }
  return channel
}

/** Publish an event to all subscribers of a session and append to replay buffer. */
export function publish(sessionId: string, event: Record<string, unknown>) {
  const channel = getOrCreate(sessionId)
  channel.buffer.push(event)
  if (channel.buffer.length > REPLAY_BUFFER_SIZE) {
    channel.buffer.shift()
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
  listener: (event: Record<string, unknown>) => void,
): () => void {
  const channel = getOrCreate(sessionId)

  // Send replay buffer
  for (const event of channel.buffer) {
    try {
      listener(event)
    } catch {
      // Skip
    }
  }

  channel.listeners.add(listener)
  return () => {
    channel.listeners.delete(listener)
    // Clean up empty channels
    if (channel.listeners.size === 0 && channel.buffer.length === 0) {
      channels.delete(sessionId)
    }
  }
}

/** Clear the channel for a session (called when streaming ends). */
export function close(sessionId: string) {
  channels.delete(sessionId)
}

/** Check if a session has an active channel with buffered events. */
export function isActive(sessionId: string): boolean {
  const channel = channels.get(sessionId)
  return !!channel && channel.buffer.length > 0
}
