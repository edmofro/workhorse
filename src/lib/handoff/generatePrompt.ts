/**
 * Generate a context-rich briefing prompt for external agents.
 * Explains the Workhorse system and gives the card's context,
 * but does not prescribe a task — the human tells the external agent what to do.
 */

import { isMockupPath } from '../paths'

interface HandoffContext {
  cardIdentifier: string
  cardTitle: string
  branchName: string
  baseBranch: string
  workhorseFiles: string[]
  codeFiles: string[]
  status: string
  attachmentFiles?: string[]
  journalSummary?: string
}

export function generateHandoffPrompt(ctx: HandoffContext): string {
  const lines: string[] = []

  lines.push(`# ${ctx.cardTitle} (${ctx.cardIdentifier})`)
  lines.push('')

  // Git setup
  lines.push('## Setup')
  lines.push('```')
  lines.push(`git fetch origin ${ctx.branchName}`)
  lines.push(`git checkout ${ctx.branchName}`)
  lines.push('```')
  lines.push('')

  // System overview
  lines.push('## Workhorse structure')
  lines.push('- Specs live in `.workhorse/specs/` — acceptance criteria in markdown')
  lines.push('- Design system: `.workhorse/design/design-system.md`')
  lines.push('- Mockups: `.workhorse/design/mockups/` — standalone HTML with inline CSS')
  lines.push('')

  // What to read
  lines.push('## What to read')
  lines.push(`Diff the card branch against main to see what specs and mockups have been added or changed:`)
  lines.push('```')
  lines.push(`git diff ${ctx.baseBranch}...${ctx.branchName} -- .workhorse/`)
  lines.push('```')
  lines.push('')

  const specFiles = ctx.workhorseFiles.filter((f) => f.startsWith('.workhorse/specs/'))
  const mockupFiles = ctx.workhorseFiles.filter((f) => isMockupPath(f))
  const attachmentFiles = ctx.attachmentFiles ?? ctx.workhorseFiles.filter((f) => f.startsWith('.workhorse/attachments/'))

  if (specFiles.length > 0) {
    lines.push('Specs:')
    for (const f of specFiles) {
      lines.push(`- ${f}`)
    }
    lines.push('')
  }

  if (mockupFiles.length > 0) {
    lines.push('Mockups:')
    for (const f of mockupFiles) {
      lines.push(`- ${f}`)
    }
    lines.push('')
  }

  if (attachmentFiles.length > 0) {
    lines.push('Attachments (screenshots/reference):')
    for (const f of attachmentFiles) {
      lines.push(`- ${f}`)
    }
    lines.push('')
  }

  // Journal summary
  if (ctx.journalSummary) {
    lines.push('## Progress so far')
    lines.push(ctx.journalSummary)
    lines.push('')
  }

  // Code changes
  if (ctx.status === 'IMPLEMENTING' || ctx.codeFiles.length > 0) {
    lines.push('## Code changes')
    lines.push('Code changes should meet the spec acceptance criteria. Review the diff:')
    lines.push('```')
    lines.push(`git diff ${ctx.baseBranch}...${ctx.branchName}`)
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}
