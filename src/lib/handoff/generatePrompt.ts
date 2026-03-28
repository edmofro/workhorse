/**
 * Generate a lightweight implementation prompt for clipboard.
 * Points the AI at file paths and a diff command — doesn't inline content.
 */

interface HandoffContext {
  featureIdentifier: string
  featureTitle: string
  branchName: string
  baseBranch: string
  specs: { filePath: string; isNew: boolean }[]
  mockupPaths: string[]
}

export function generateHandoffPrompt(ctx: HandoffContext): string {
  const lines: string[] = []

  lines.push(`git fetch origin ${ctx.branchName}`)
  lines.push(`git checkout ${ctx.branchName}`)
  lines.push('')

  const newSpecs = ctx.specs.filter((s) => s.isNew)
  const updatedSpecs = ctx.specs.filter((s) => !s.isNew)

  if (newSpecs.length > 0) {
    lines.push('New specs:')
    for (const s of newSpecs) {
      lines.push(`- ${s.filePath}`)
    }
    lines.push('')
  }

  if (updatedSpecs.length > 0) {
    lines.push('Updated specs:')
    for (const s of updatedSpecs) {
      lines.push(`- ${s.filePath}`)
    }
    lines.push('')
  }

  if (ctx.mockupPaths.length > 0) {
    lines.push('Mockups:')
    for (const p of ctx.mockupPaths) {
      lines.push(`- ${p}`)
    }
    lines.push('')
  }

  lines.push('Review the diff to see what changed:')
  lines.push(
    `git diff ${ctx.baseBranch}...${ctx.branchName} -- .workhorse/`,
  )
  lines.push('')
  lines.push('Read the specs and mockups, then implement all acceptance criteria.')

  return lines.join('\n')
}
