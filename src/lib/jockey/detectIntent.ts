/**
 * Pre-turn skill intent detection.
 *
 * Runs a cheap Haiku pass before the agent processes the user's message.
 * Returns a skill ID if the message clearly invokes one, otherwise null.
 */

import { anthropic } from '../anthropic'
import { BUILT_IN_SKILLS, isValidSkillId } from '../skills/registry'

export interface SkillDetectionInput {
  userMessage: string
  cardTitle: string
  cardStatus: string
  journalEntries: { type: string; summary: string }[]
}

const SKILL_LIST = Object.values(BUILT_IN_SKILLS)
  .map((s) => `- **${s.id}**: ${s.description}`)
  .join('\n')

const DETECTION_SYSTEM_PROMPT = `You are a skill classifier for Workhorse, a spec-driven development workbench. Determine whether a user message clearly and unambiguously invokes one of the available skills.

## Available skills

${SKILL_LIST}

## Rules

- Only return a skill ID if the intent is clear and unambiguous
- Return null for conversational messages, follow-up replies, or continuations of an existing flow
- Return null when in doubt — a missed detection is better than a wrong injection
- Respond with only the exact skill ID (e.g. \`interview\`) or the word \`null\` — no explanation`

function buildPrompt(input: SkillDetectionInput): string {
  const lines: string[] = []

  lines.push(`Card: ${input.cardTitle} (status: ${input.cardStatus})`)

  if (input.journalEntries.length > 0) {
    const recent = input.journalEntries.slice(-3).map((e) => e.summary).join('; ')
    lines.push(`Recent activity: ${recent}`)
  }

  lines.push(`\nIncoming message: "${input.userMessage}"`)
  lines.push('\nWhich skill is the user invoking, if any?')

  return lines.join('\n')
}

/** Returns a validated skill ID, or null if intent is unclear or the call fails. */
export async function detectSkillIntent(input: SkillDetectionInput): Promise<string | null> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 32,
      system: DETECTION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPrompt(input) }],
    })

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('')
      .trim()
      .toLowerCase()

    if (!text || text === 'null') return null

    return isValidSkillId(text) ? text : null
  } catch {
    return null
  }
}
