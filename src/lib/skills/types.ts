/**
 * Skill type definitions.
 *
 * A skill is an action that can be performed on a card. Skills wrap the existing
 * agent mode system with structured metadata for the jockey and journey bar.
 */

export type SkillExecution = 'inline' | 'subagent'

export interface Skill {
  /** Unique identifier, used in API calls and storage */
  id: string
  /** Human-readable label shown in pills and journey bar */
  label: string
  /** Short description for tooltips or jockey context */
  description: string
  /** How the skill runs: inline in the primary conversation, or as a fresh-context subagent */
  execution: SkillExecution
  /** System prompt fragment injected when this skill is active */
  buildInstructions: (ctx: SkillContext) => string
}

export interface SkillContext {
  cardTitle: string
  cardDescription: string | null
}

/** A pill suggestion from the jockey */
export interface PillSuggestion {
  skillId: string
  label: string
}

/** A journey step (completed, active, or suggested) */
export interface JourneyStep {
  skillId: string
  label: string
}
