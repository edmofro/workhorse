'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SidebarData, SidebarSession } from './queries'

/**
 * Connects to the sidebar SSE endpoint and pushes real-time updates
 * into the react-query cache so the sidebar updates instantly.
 *
 * Returns a Set of session IDs that are currently streaming (for
 * pulsating indicators).
 */
export function useSidebarEvents() {
  const queryClient = useQueryClient()
  const [streamingSessions, setStreamingSessions] = useState<Set<string>>(new Set())
  const retryDelay = useRef(1000)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    const eventSource = new EventSource('/api/sidebar-events')

    eventSource.onopen = () => {
      retryDelay.current = 1000
    }

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)

        // Handle initial streaming sessions snapshot on connect/reconnect
        if (event.type === 'streaming_sessions') {
          const ids = event.sessionIds as string[]
          setStreamingSessions(new Set(ids))
          return
        }

        const session = event.session as SidebarSession

        if (event.type === 'session_created') {
          // Add new session to the top of the list and mark as streaming
          queryClient.setQueryData<SidebarData>(['sidebar-data'], (old) => {
            if (!old) return old
            const exists = old.recentSessions.some((s) => s.id === session.id)
            if (exists) return old
            return {
              ...old,
              recentSessions: [session, ...old.recentSessions],
            }
          })
          setStreamingSessions((prev) => new Set(prev).add(session.id))
        }

        if (event.type === 'streaming_start') {
          // Move to top of the list when it becomes active
          queryClient.setQueryData<SidebarData>(['sidebar-data'], (old) => {
            if (!old) return old
            const idx = old.recentSessions.findIndex((s) => s.id === session.id)
            if (idx <= 0) return old // already at top or not found
            const updated = [...old.recentSessions]
            updated.splice(idx, 1)
            return {
              ...old,
              recentSessions: [{ ...old.recentSessions[idx], ...session }, ...updated],
            }
          })
          setStreamingSessions((prev) => new Set(prev).add(session.id))
        }

        if (event.type === 'streaming_stop') {
          // Update session data and move to top
          queryClient.setQueryData<SidebarData>(['sidebar-data'], (old) => {
            if (!old) return old
            const filtered = old.recentSessions.filter((s) => s.id !== session.id)
            const existing = old.recentSessions.find((s) => s.id === session.id)
            return {
              ...old,
              recentSessions: [{ ...existing, ...session }, ...filtered],
            }
          })
          setStreamingSessions((prev) => {
            const next = new Set(prev)
            next.delete(session.id)
            return next
          })
        }

        if (event.type === 'session_updated') {
          queryClient.setQueryData<SidebarData>(['sidebar-data'], (old) => {
            if (!old) return old
            return {
              ...old,
              recentSessions: old.recentSessions.map((s) =>
                s.id === session.id ? { ...s, ...session } : s,
              ),
            }
          })
        }
      } catch {
        // Ignore unparseable events
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      if (!mountedRef.current) return
      // Reconnect with exponential backoff (max 30s)
      const delay = retryDelay.current
      retryDelay.current = Math.min(delay * 2, 30_000)
      setTimeout(connect, delay)
    }

    return eventSource
  }, [queryClient])

  useEffect(() => {
    mountedRef.current = true
    const eventSource = connect()
    return () => {
      mountedRef.current = false
      eventSource?.close()
    }
  }, [connect])

  return streamingSessions
}
