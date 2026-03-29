/**
 * Session instructions appended to the claude_code system prompt preset.
 * Provides rich Workhorse context, card context, and mode-specific instructions.
 */

import { buildWorkhorseContext, buildModeInstructions, type AgentMode } from './workhorseContext'

interface SessionContext {
  cardTitle: string
  cardDescription: string | null
  cardIdentifier: string
  projectName: string
  repoOwner: string
  repoName: string
  attachmentFiles?: string[]
  mode?: AgentMode
}

export function buildSessionInstructions(ctx: SessionContext): string {
  const parts: string[] = []

  // Rich Workhorse domain context — so the agent never needs to "explore"
  parts.push(buildWorkhorseContext())

  // Card-specific context
  parts.push(`## The card you are working on

**Title:** ${ctx.cardTitle}
**ID:** ${ctx.cardIdentifier}
${ctx.cardDescription ? `**Description:** ${ctx.cardDescription}` : ''}
**Project:** ${ctx.projectName}
**Repository:** ${ctx.repoOwner}/${ctx.repoName}`)

  // File path guidance
  parts.push(`## Where to write files for this card

- **Specs:** \`.workhorse/specs/{area}/{slug}.md\` — choose the area based on the codebase structure
- **Mockups:** \`.workhorse/design/mockups/${ctx.cardIdentifier.toLowerCase()}/{slug}.html\` — standalone HTML with inline CSS`)

  // Mode-specific instructions
  parts.push(buildModeInstructions(ctx.mode, ctx.cardTitle, ctx.cardDescription))

  // Working with files
  parts.push(`## Working with files

- Read existing specs and codebase proactively to inform your work
- Edit spec files in place when refining criteria — do not reproduce them in chat
- Create new spec files at paths you determine based on codebase structure
- When you write or edit a spec file, mention it briefly in your response (e.g. "Updated the allergies spec with the edge case")
- Do NOT reproduce full file contents in your messages — just describe what you changed`)

  if (ctx.attachmentFiles && ctx.attachmentFiles.length > 0) {
    parts.push(`## Attachments

The user has attached files to this card. They are stored in the worktree at:
\`.workhorse/attachments/${ctx.cardIdentifier.toLowerCase()}/\`

Available files:
${ctx.attachmentFiles.map((f) => `- ${f}`).join('\n')}

You can read these files using the Read tool. Image files (screenshots, mockups, diagrams) will be rendered visually. Use these attachments as context when developing specs — they may show existing UI, desired designs, error states, or other reference material.

When the user sends images inline with their messages, examine them carefully and incorporate any relevant details into the acceptance criteria.`)
  }

  return parts.join('\n\n')
}
