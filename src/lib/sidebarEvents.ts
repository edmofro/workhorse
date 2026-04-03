/**
 * In-memory event emitter for real-time sidebar updates.
 *
 * When an agent session starts, updates, or finishes, events are broadcast
 * to all connected SSE clients so the sidebar updates instantly.
 */

export interface SidebarEvent {
  type: 'session_created' | 'session_updated' | 'streaming_start' | 'streaming_stop'
  userId: string
  session: {
    id: string
    title: string | null
    messageCount: number
    lastMessageAt: string
    cardId: string | null
    cardIdentifier: string | null
    cardTitle: string | null
    cardStatus: string | null
    teamColour: string | null
    projectName: string | null
  }
}

type Listener = (event: SidebarEvent) => void

const listeners = new Set<Listener>()

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emit(event: SidebarEvent) {
  for (const listener of listeners) {
    try {
      listener(event)
    } catch {
      // Don't let one broken listener affect others
    }
  }
}
