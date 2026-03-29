/**
 * Generate a lightweight implementation prompt for clipboard.
 * Points the AI at file paths and a diff command — doesn't inline content.
 */

interface HandoffContext {
  cardIdentifier: string
  cardTitle: string
  branchName: string
  baseBranch: string
  touchedFiles: string[]
  status: string
  attachmentFiles?: string[]
}

export function generateHandoffPrompt(ctx: HandoffContext): string {
  const lines: string[] = []

  lines.push(`git fetch origin ${ctx.branchName}`)
  lines.push(`git checkout ${ctx.branchName}`)
  lines.push('')

  const specFiles = ctx.touchedFiles.filter((f) => f.startsWith('.workhorse/specs/'))
  const mockupFiles = ctx.touchedFiles.filter((f) => f.startsWith('.workhorse/design/mockups/'))
  const attachmentFiles = ctx.attachmentFiles ?? ctx.touchedFiles.filter((f) => f.startsWith('.workhorse/attachments/'))

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

    if (attachmentFiles.length > 0) {
      lines.push('Attachments (screenshots/reference images):')
      for (const f of attachmentFiles) {
        lines.push(`- ${f}`)
      }
      lines.push('')
    }

    lines.push('Review the current specs and the codebase, then help develop')
    lines.push('the acceptance criteria. Edit the spec files directly.')
    if (attachmentFiles.length > 0) {
      lines.push('Read the attachment images for visual context.')
    }
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

    if (attachmentFiles.length > 0) {
      lines.push('Attachments (screenshots/reference images):')
      for (const f of attachmentFiles) {
        lines.push(`- ${f}`)
      }
      lines.push('')
    }

    lines.push('Review the diff to see what changed:')
    lines.push(`git diff ${ctx.baseBranch}...${ctx.branchName} -- .workhorse/`)
    lines.push('')
    lines.push('Read the specs and mockups, then implement all acceptance criteria.')
    if (attachmentFiles.length > 0) {
      lines.push('Read the attachment images for visual reference.')
    }
  }

  return lines.join('\n')
}
