/**
 * Jockey assessment — a lightweight Haiku LLM call that observes the conversation
 * and tracks card progress.
 */

import { anthropic } from '../anthropic'
import { BUILT_IN_SKILLS } from '../skills/registry'
import type { JockeyInput, JockeyAssessment } from './types'

const JOCKEY_SYSTEM_PROMPT = `You are the jockey — a lightweight observer that tracks the progress of a card's workflow in Workhorse, a spec-driven development workbench.

Your job is to watch the conversation on a card and decide:
1. Did something noteworthy just happen? (skill started, skill completed, significant milestone)
2. What is the user most likely to want to do next? (pill suggestions)
3. What's the expected remaining sequence of steps? (journey suggestions)

## Available skills
${Object.values(BUILT_IN_SKILLS).map(s => `- **${s.id}** (${s.label}): ${s.description}`).join('\n')}

## Rules
- Only create journal entries for genuinely noteworthy transitions — not every message deserves one
- Journal entry types should match skill IDs where applicable (e.g. "interview", "implementation", "spec-draft")
- Journal summaries should be concise and human-readable (e.g. "Spec interview completed — 2 specs written")
- Pills are 2-4 contextual actions for RIGHT NOW — the most useful things the user could click
- Suggestions are the expected remaining sequence — the big picture of what's ahead
- Pills and suggestions can differ significantly
- If the conversation has just started and nothing meaningful has happened, return empty journalEntries
- Set startNextScheduled to true ONLY if the current step clearly just completed AND there's a scheduled next step
- Return valid JSON matching the schema exactly`

/** Escape XML special chars to prevent tag breakout in LLM prompts */
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildAssessmentPrompt(input: JockeyInput): string {
  const parts: string[] = []

  parts.push('## Current journal')
  if (input.journalEntries.length === 0) {
    parts.push('(empty — this card has no journal entries yet)')
  } else {
    for (const entry of input.journalEntries) {
      parts.push(`- [${escapeXml(entry.type)}] ${escapeXml(entry.summary)} (${entry.createdAt.toISOString().split('T')[0]})`)
    }
  }

  parts.push('')
  parts.push('## Scheduled steps')
  if (input.scheduledSteps.length === 0) {
    parts.push('(none scheduled)')
  } else {
    for (const step of input.scheduledSteps) {
      parts.push(`${step.position + 1}. ${step.skillId}`)
    }
  }

  parts.push('')
  parts.push('## Card context')
  // Wrap user-supplied content in XML tags to separate data from instructions.
  parts.push(`<card_title>${escapeXml(input.cardTitle)}</card_title>`)
  parts.push(`Status: ${input.cardStatus}`)
  parts.push(`Has specs: ${input.hasSpecs ? 'yes' : 'no'}`)
  parts.push(`Has code changes: ${input.hasCodeChanges ? 'yes' : 'no'}`)
  parts.push(`Has open PR: ${input.hasPr ? 'yes' : 'no'}`)

  parts.push('')
  parts.push('## Recent conversation')
  if (input.recentMessages.length === 0) {
    parts.push('(no messages yet)')
  } else {
    // Wrap conversation in XML delimiters to separate user content from instructions
    parts.push('<conversation_transcript>')
    const windowStart = Math.max(0, input.recentMessages.length - input.newMessageCount)
    // Show context messages (before the new ones)
    for (let i = Math.max(0, windowStart - 6); i < windowStart; i++) {
      const msg = input.recentMessages[i]
      const safe = escapeXml(msg.content.slice(0, 300))
      parts.push(`[context] ${msg.role}: ${safe}${msg.content.length > 300 ? '...' : ''}`)
    }
    // Show new messages (since last assessment)
    for (let i = windowStart; i < input.recentMessages.length; i++) {
      const msg = input.recentMessages[i]
      const safe = escapeXml(msg.content.slice(0, 500))
      parts.push(`[NEW] ${msg.role}: ${safe}${msg.content.length > 500 ? '...' : ''}`)
    }
    parts.push('</conversation_transcript>')
  }

  parts.push('')
  parts.push('Respond with a JSON object matching this schema:')
  parts.push('```json')
  parts.push('{')
  parts.push('  "journalEntries": [{ "type": "string", "summary": "string" }],')
  parts.push('  "activeStep": "string or null",')
  parts.push('  "pills": [{ "skillId": "string", "label": "string" }],')
  parts.push('  "suggestions": [{ "skillId": "string", "label": "string" }],')
  parts.push('  "startNextScheduled": false')
  parts.push('}')
  parts.push('```')

  return parts.join('\n')
}

/**
 * Run a jockey assessment. Returns the assessment or a safe default if the call fails.
 */
export async function runJockeyAssessment(input: JockeyInput): Promise<JockeyAssessment> {
  const defaultAssessment: JockeyAssessment = {
    journalEntries: [],
    activeStep: null,
    pills: getDefaultPills(input),
    suggestions: getDefaultSuggestions(input),
    startNextScheduled: false,
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: JOCKEY_SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildAssessmentPrompt(input) },
      ],
    })

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => ('text' in block ? block.text : ''))
      .join('')

    // Extract JSON from the response — strip markdown code fences first,
    // then find the outermost { ... } block.
    const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '')
    const jsonMatch = stripped.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[jockey] No JSON found in response, using defaults')
      return defaultAssessment
    }

    const parsed = JSON.parse(jsonMatch[0]) as JockeyAssessment

    // Validate the shape — filter out malformed items from LLM arrays
    const validEntry = (e: unknown): e is { type: string; summary: string } =>
      !!e && typeof (e as Record<string, unknown>).type === 'string' && typeof (e as Record<string, unknown>).summary === 'string'
    const validPill = (p: unknown): p is { skillId: string; label: string } =>
      !!p && typeof (p as Record<string, unknown>).skillId === 'string' && typeof (p as Record<string, unknown>).label === 'string'

    return {
      journalEntries: Array.isArray(parsed.journalEntries) ? parsed.journalEntries.filter(validEntry) : [],
      activeStep: typeof parsed.activeStep === 'string' ? parsed.activeStep : null,
      pills: Array.isArray(parsed.pills) ? parsed.pills.filter(validPill).slice(0, 4) : defaultAssessment.pills,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter(validPill) : defaultAssessment.suggestions,
      startNextScheduled: parsed.startNextScheduled === true,
    }
  } catch (error) {
    console.warn('[jockey] Assessment failed, using defaults:', error)
    return defaultAssessment
  }
}

interface DefaultsContext {
  hasCodeChanges: boolean
  hasPr: boolean
  hasSpecs: boolean
  journalEntries: { type: string }[]
}

/** Deterministic fallback pills when the jockey LLM call fails or hasn't run yet */
export function getDefaultPills(input: DefaultsContext): JockeyAssessment['pills'] {
  if (input.hasCodeChanges && !input.hasPr) {
    return [
      { skillId: 'design_audit', label: 'Design audit' },
      { skillId: 'create_pr', label: 'Create PR' },
    ]
  }
  if (input.journalEntries.some(e => e.type === 'implementation')) {
    return [
      { skillId: 'design_audit', label: 'Design audit' },
      { skillId: 'code_review', label: 'Code review' },
    ]
  }
  if (input.hasSpecs) {
    return [
      { skillId: 'interview', label: 'Continue interview' },
      { skillId: 'review', label: 'Review specs' },
      { skillId: 'directed', label: 'Make changes' },
    ]
  }
  return [
    { skillId: 'interview', label: 'Interview me' },
    { skillId: 'draft', label: 'Draft a spec' },
    { skillId: 'mockup', label: 'Add a mockup' },
  ]
}

/** Deterministic fallback suggestions when the jockey LLM call fails */
export function getDefaultSuggestions(input: Pick<DefaultsContext, 'hasSpecs' | 'journalEntries'>): JockeyAssessment['suggestions'] {
  const suggestions: JockeyAssessment['suggestions'] = []
  if (!input.hasSpecs) {
    suggestions.push({ skillId: 'interview', label: 'Interview' })
  }
  if (!input.journalEntries.some(e => e.type === 'spec-review')) {
    suggestions.push({ skillId: 'review', label: 'Review specs' })
  }
  suggestions.push({ skillId: 'implement', label: 'Implement' })
  suggestions.push({ skillId: 'create_pr', label: 'Create PR' })
  return suggestions
}
