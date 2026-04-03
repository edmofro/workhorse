/**
 * Jockey type definitions.
 */

export interface JockeyInput {
  /** Current journal entries for this card */
  journalEntries: { type: string; summary: string; createdAt: Date }[]
  /** Currently scheduled steps */
  scheduledSteps: { skillId: string; position: number }[]
  /** Recent conversation messages (sliding window) */
  recentMessages: { role: 'user' | 'assistant'; content: string }[]
  /** Which messages are new since last assessment */
  newMessageCount: number
  /** Card title for context */
  cardTitle: string
  /** Card status */
  cardStatus: string
  /** Whether the card has spec files */
  hasSpecs: boolean
  /** Whether the card has code changes outside .workhorse/ */
  hasCodeChanges: boolean
  /** Whether the card has an open PR */
  hasPr: boolean
}

export interface JockeyAssessment {
  /** New journal entries to create (empty if nothing noteworthy) */
  journalEntries: { type: string; summary: string }[]
  /** Label for the currently active step (for collapsed journey bar) */
  activeStep: string | null
  /** Pill suggestions — 2-4 skills relevant right now */
  pills: { skillId: string; label: string }[]
  /** Journey suggestions — expected remaining sequence */
  suggestions: { skillId: string; label: string }[]
  /** Whether to auto-start the next scheduled step */
  startNextScheduled: boolean
}
