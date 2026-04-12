/**
 * Generate a lightweight implementation prompt for clipboard.
 * Points the AI at file paths and a diff command — doesn't inline content.
 */

import { isMockupPath } from '../paths'

interface HandoffContext {
  cardIdentifier: string
  cardTitle: string
  branchName: string
  baseBranch: string
  touchedFiles: string[]
  status: string
}

export function generateHandoffPrompt(ctx: HandoffContext): string {
  const lines: string[] = []

  lines.push(`git fetch origin ${ctx.branchName}`)
  lines.push(`git checkout ${ctx.branchName}`)
  lines.push('')

  const specFiles = ctx.touchedFiles.filter((f) => f.startsWith('.workhorse/specs/'))
  const mockupFiles = ctx.touchedFiles.filter((f) => isMockupPath(f))

  if (ctx.status === 'SPECIFYING') {
    if (specFiles.length > 0) {
      lines.push('Specs in progress:')
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

    lines.push('Review the current specs and the codebase, then help develop')
    lines.push('the acceptance criteria. Edit the spec files directly.')
  } else {
    // IMPLEMENTING or other
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

    lines.push('Review the diff to see what changed:')
    lines.push(`git diff ${ctx.baseBranch}...${ctx.branchName} -- .workhorse/`)
    lines.push('')
    lines.push('Read the specs and mockups, then implement all acceptance criteria.')
  }

  return lines.join('\n')
}
