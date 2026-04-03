'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

export interface JournalEntryData {
  id: string
  type: string
  summary: string
  createdAt: string
}

export interface ScheduledStepData {
  id: string
  skillId: string
  position: number
}

export interface PillSuggestion {
  skillId: string
  label: string
}

export interface JockeyState {
  journalEntries: JournalEntryData[]
  scheduledSteps: ScheduledStepData[]
  pills: PillSuggestion[]
  suggestions: PillSuggestion[]
  activeStep: string | null
  hasCodeChanges: boolean
}

export function useJockeyState(cardId: string) {
  const [state, setState] = useState<JockeyState>({
    journalEntries: [],
    scheduledSteps: [],
    pills: [],
    suggestions: [],
    activeStep: null,
    hasCodeChanges: false,
  })

  // Fetch initial state on mount
  const { data: initialData } = useQuery({
    queryKey: ['jockey', cardId],
    queryFn: async () => {
      const res = await fetch(`/api/jockey?cardId=${cardId}`)
      if (!res.ok) return null
      return res.json() as Promise<JockeyState>
    },
    staleTime: 30_000,
  })

  // Sync initial data once
  useEffect(() => {
    if (initialData) {
      setState(initialData)
    }
  }, [initialData])

  /** Called when a jockey SSE event arrives during conversation */
  const handleJockeyEvent = useCallback((event: {
    journalEntries?: { type: string; summary: string }[]
    pills?: PillSuggestion[]
    suggestions?: PillSuggestion[]
    activeStep?: string | null
    startNextScheduled?: boolean
  }) => {
    setState(prev => {
      const newJournalEntries = event.journalEntries?.length
        ? [
            ...prev.journalEntries,
            ...event.journalEntries.map(e => ({
              id: `temp-${Date.now()}-${Math.random()}`,
              type: e.type,
              summary: e.summary,
              createdAt: new Date().toISOString(),
            })),
          ]
        : prev.journalEntries

      // If startNextScheduled, remove the first scheduled step
      const newScheduledSteps = event.startNextScheduled && prev.scheduledSteps.length > 0
        ? prev.scheduledSteps.slice(1)
        : prev.scheduledSteps

      return {
        ...prev,
        journalEntries: newJournalEntries,
        scheduledSteps: newScheduledSteps,
        pills: event.pills ?? prev.pills,
        suggestions: event.suggestions ?? prev.suggestions,
        activeStep: event.activeStep !== undefined ? event.activeStep : prev.activeStep,
      }
    })
  }, [])

  /** Schedule a suggested step */
  const scheduleStep = useCallback(async (skillId: string, label: string) => {
    const res = await fetch('/api/scheduled-steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, skillId }),
    })
    if (!res.ok) return

    const step = await res.json() as ScheduledStepData

    setState(prev => ({
      ...prev,
      scheduledSteps: [...prev.scheduledSteps, step],
      // Remove from suggestions
      suggestions: prev.suggestions.filter(s => s.skillId !== skillId || s.label !== label),
    }))
  }, [cardId])

  /** Unschedule a step (return to suggestions) */
  const unscheduleStep = useCallback(async (stepId: string) => {
    const step = state.scheduledSteps.find(s => s.id === stepId)
    if (!step) return

    await fetch('/api/scheduled-steps', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, stepId }),
    })

    setState(prev => {
      const removed = prev.scheduledSteps.find(s => s.id === stepId)
      return {
        ...prev,
        scheduledSteps: prev.scheduledSteps.filter(s => s.id !== stepId),
        // Add back to suggestions if we know the skill
        suggestions: removed
          ? [...prev.suggestions, { skillId: removed.skillId, label: removed.skillId }]
          : prev.suggestions,
      }
    })
  }, [cardId, state.scheduledSteps])

  return {
    ...state,
    handleJockeyEvent,
    scheduleStep,
    unscheduleStep,
  }
}
