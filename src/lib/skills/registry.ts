/**
 * Built-in skills registry.
 *
 * Each skill has structured metadata for the jockey and journey bar,
 * plus prompt instructions for the agent session.
 */

import type { Skill } from './types'

export const BUILT_IN_SKILLS: Record<string, Skill> = {
  workshop: {
    id: 'workshop',
    label: 'Workshop',
    description: 'Open-ended ideation and exploration of an idea',
    execution: 'inline',
    buildInstructions: () => `## Your task: Workshop ideas

The user wants to explore and refine an idea. Help them think through approaches, trade-offs, and possibilities. Generate mockups when a visual would help illustrate a concept. This is exploratory — follow the user's curiosity rather than driving toward a specific output.`,
  },

  interview: {
    id: 'interview',
    label: 'Interview',
    description: 'Structured spec interview with probing questions',
    execution: 'inline',
    buildInstructions: () => `## Your task: Interview the user

Guide the user through developing comprehensive acceptance criteria. Use the interview methodology:

1. **Understand the goal** — start with the high-level intent
2. **Probe for details** — happy path first, then edge cases, error handling, interactions
3. **Surface decisions** — identify ambiguity and ask the user to resolve it
4. **Track open questions** — maintain unresolved questions
5. **Extract acceptance criteria** — as the conversation progresses, extract concrete criteria
6. **Signal completeness** — when the spec has sufficient detail, say so

Ask focused questions — one or two at a time, not long lists. **Number your questions** (1., 2., etc.) so the user can reply by number. Example:

1. Where can this action be triggered from — the board, the workspace, or both?
2. Should there be a confirmation step before it happens?

**Proactively generate mockups** when discussing UI-heavy features — create mockup HTML files whenever a visual would help illustrate the concept being discussed, without waiting to be asked.`,
  },

  draft: {
    id: 'draft',
    label: 'Draft spec',
    description: 'Generate a complete spec draft from the card description',
    execution: 'inline',
    buildInstructions: () => `## Your task: Draft specs immediately

The user clicked "Draft a spec" — they want you to produce spec files right away from the card description, without an extended interview.

1. Read the card title and description carefully.
2. Read existing specs in \`.workhorse/specs/\` to understand the area structure and avoid duplicating existing specs.
3. Determine which area this spec belongs in based on the existing structure.
4. Write one or more spec files directly to \`.workhorse/specs/{area}/{slug}.md\`.
5. Include a brief summary of what you created and any open questions you identified.

Do NOT start by asking questions or exploring the codebase. Go straight to drafting. If the description is too thin to write meaningful acceptance criteria, write what you can and list the gaps as open questions in the spec.

**Generate mockups** for any UI-facing specs as part of the draft.`,
  },

  review: {
    id: 'review',
    label: 'Review specs',
    description: 'Fresh-eyes review for gaps, contradictions, and cross-spec impact',
    execution: 'subagent',
    buildInstructions: () => `## Your task: Review existing specs

Read the spec files in \`.workhorse/specs/\` that relate to this card and provide a thorough review:

- Gaps in acceptance criteria
- Contradictions between specs
- Missing edge cases
- Unclear or ambiguous criteria
- Information architecture issues (content in the wrong spec)
- Cross-spec impact (existing specs that should be updated)

Be specific and constructive. Reference exact criteria when noting issues.`,
  },

  directed: {
    id: 'directed',
    label: 'Make changes',
    description: 'Follow user instructions to make targeted spec/mockup changes',
    execution: 'inline',
    buildInstructions: () => `## Your task: Make specific changes

The user wants to make targeted changes to existing specs. Wait for them to describe what they want changed, then edit the spec files directly. Keep changes focused — don't restructure or rewrite sections that aren't relevant to the request.`,
  },

  mockup: {
    id: 'mockup',
    label: 'Add mockup',
    description: 'Create or refine HTML/CSS mockups',
    execution: 'inline',
    buildInstructions: () => `## Your task: Create a mockup

The user wants to create or refine a visual mockup. Ask what they want to see, accept pasted HTML/Figma exports, and generate a clean mockup HTML file in \`.workhorse/design/mockups/{card-id}/\`. Reference the design system in \`.workhorse/design/design-system.md\` for consistency.`,
  },

  implement: {
    id: 'implement',
    label: 'Implement',
    description: 'Implement acceptance criteria from specs',
    execution: 'inline',
    buildInstructions: () => `## Your task: Implement from specs

Read the relevant specs in \`.workhorse/specs/\` and diff them against main to identify what's new or changed. Implement the acceptance criteria in code. Follow the design system in \`.workhorse/design/design-system.md\` for any UI work.`,
  },

  design_audit: {
    id: 'design_audit',
    label: 'Design audit',
    description: 'Review implementation against the project design system',
    execution: 'subagent',
    buildInstructions: () => `## Your task: Design audit

Run a design audit using \`.workhorse/design/\` — both high-level principles and pixel-level detail. Read the design system docs, then review the implementation for compliance. Check colour palette, typography, spacing, component patterns, and design philosophy.`,
  },

  security_audit: {
    id: 'security_audit',
    label: 'Security audit',
    description: 'Review implementation for security concerns',
    execution: 'subagent',
    buildInstructions: () => `## Your task: Security audit

Review the implementation for security concerns. Check for:

- Authentication and authorisation gaps
- Input validation and sanitisation
- SQL injection, XSS, CSRF vulnerabilities
- Sensitive data exposure
- Access control issues`,
  },

  code_review: {
    id: 'code_review',
    label: 'Code review',
    description: 'Review implementation code against spec acceptance criteria',
    execution: 'subagent',
    buildInstructions: () => `## Your task: Code review

Review the implementation code against the spec acceptance criteria. Focus on whether the code correctly implements what the spec describes. Read the specs first, then review the code changes.`,
  },

  create_pr: {
    id: 'create_pr',
    label: 'Create PR',
    description: 'Create a GitHub pull request from the card branch',
    execution: 'inline',
    buildInstructions: () => `## Your task: Create a pull request

Read the specs and code changes on this branch, then create a GitHub pull request. Write a clear PR title and description summarising what changed and why. The backend will handle the GitHub API call.`,
  },

  fix_ci: {
    id: 'fix_ci',
    label: 'Fix CI',
    description: 'Diagnose and fix CI failures',
    execution: 'inline',
    buildInstructions: () => `## Your task: Fix CI failures

Read the CI failure output, diagnose the issue, and push fixes. Focus on getting the tests/build passing without introducing regressions.`,
  },

  update_spec: {
    id: 'update_spec',
    label: 'Update spec',
    description: 'Update spec files to reflect current implementation or new decisions',
    execution: 'inline',
    buildInstructions: () => `## Your task: Update specs

The implementation or conversation has diverged from the current spec. Update the spec files in \`.workhorse/specs/\` to reflect the current state of decisions and implementation. Keep specs as declarative descriptions of the system, not changelogs.`,
  },
}

/**
 * Convert a skill/type ID into a presentable label.
 * Handles both underscores (skill IDs: design_audit) and hyphens
 * (journal types: spec-draft), title-casing the result.
 */
export function humaniseSkillId(id: string): string {
  return id
    .replace(/[-_]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
}

/** Get a skill by ID, returns undefined if not found */
export function getSkill(id: string): Skill | undefined {
  return BUILT_IN_SKILLS[id]
}

/** Get all skill IDs */
export function getAllSkillIds(): string[] {
  return Object.keys(BUILT_IN_SKILLS)
}

/** Validate a skill ID. */
export function isValidSkillId(value: string | undefined): boolean {
  if (!value) return false
  return value in BUILT_IN_SKILLS
}

/**
 * Build instructions for a skill.
 * Falls back to a generic instruction if the skill is not found.
 */
export function buildSkillInstructions(
  skillId: string | undefined,
  cardTitle: string,
  cardDescription: string | null,
): string {
  if (!skillId) {
    return `## Your task\n\nAssist the user with their request related to this card. You can interview them, draft specs, review existing specs, or make targeted changes — follow the user's lead.`
  }

  const skill = getSkill(skillId)
  if (!skill) {
    return `## Your task\n\nAssist the user with their request related to this card. Follow the user's lead.`
  }

  return skill.buildInstructions({ cardTitle, cardDescription })
}
