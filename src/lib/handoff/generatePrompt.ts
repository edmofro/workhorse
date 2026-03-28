/**
 * Generate implementation handoff prompt
 */

interface HandoffContext {
  featureIdentifier: string
  featureTitle: string
  branchName: string
  specs: { filePath: string; content: string; isNew: boolean }[]
  mockups: { title: string; html: string }[]
  productName: string
  repoOwner: string
  repoName: string
}

export function generateHandoffPrompt(ctx: HandoffContext): string {
  const parts: string[] = []

  parts.push(`# Implementation handoff: ${ctx.featureIdentifier} — ${ctx.featureTitle}

## Getting started

\`\`\`bash
git fetch origin ${ctx.branchName}
git checkout ${ctx.branchName}
\`\`\`

## Product

${ctx.productName} (${ctx.repoOwner}/${ctx.repoName})

## Specs

The following spec files have been committed to the branch:
`)

  for (const spec of ctx.specs) {
    parts.push(`### ${spec.isNew ? 'New' : 'Updated'}: \`${spec.filePath}\`

\`\`\`markdown
${spec.content}
\`\`\`
`)
  }

  if (ctx.mockups.length > 0) {
    parts.push(`## Visual mockups

The following mockups were generated during the spec interview:
`)

    for (const mockup of ctx.mockups) {
      parts.push(`### ${mockup.title}

\`\`\`html
${mockup.html}
\`\`\`
`)
    }
  }

  parts.push(`## Implementation notes

- Review all spec files before beginning implementation
- Each checkbox in the spec represents a testable acceptance criterion
- Open questions (blockquotes) should be resolved before implementing that area
- If you find gaps in the spec, raise them before implementing workarounds
`)

  return parts.join('\n')
}
