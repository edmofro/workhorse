/**
 * Spec format utilities — parse and serialize YAML frontmatter + markdown
 * Per WH-006 spec format
 */

export interface SpecFrontmatter {
  title: string
  area?: string
}

export interface ParsedSpec {
  frontmatter: SpecFrontmatter
  content: string
  raw: string
}

/**
 * Parse a spec markdown file with YAML frontmatter
 */
export function parseSpec(raw: string): ParsedSpec {
  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (!frontmatterMatch) {
    return {
      frontmatter: { title: 'Untitled' },
      content: raw,
      raw,
    }
  }

  const yamlStr = frontmatterMatch[1]
  const content = frontmatterMatch[2]

  const frontmatter: SpecFrontmatter = { title: 'Untitled' }

  for (const line of yamlStr.split('\n')) {
    const match = line.match(/^(\w+):\s*(.+)$/)
    if (match) {
      const key = match[1] as keyof SpecFrontmatter
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (key === 'title') frontmatter.title = value
      else if (key === 'area') frontmatter.area = value
    }
  }

  return { frontmatter, content, raw }
}

/**
 * Serialize a spec to markdown with YAML frontmatter
 */
export function serializeSpec(frontmatter: SpecFrontmatter, content: string): string {
  const lines: string[] = ['---']

  lines.push(`title: "${frontmatter.title}"`)
  if (frontmatter.area) lines.push(`area: "${frontmatter.area}"`)

  lines.push('---')
  lines.push('')
  lines.push(content)

  return lines.join('\n')
}

/**
 * Generate a default spec file path from area and title
 */
export function generateSpecPath(area: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const areaSlug = area
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `.workhorse/specs/${areaSlug}/${slug}.md`
}

/**
 * Build a default spec template
 */
export function buildDefaultSpec(
  title: string,
  area?: string,
): string {
  return serializeSpec(
    {
      title,
      area: area ?? 'general',
    },
    `${title}

## Summary

<!-- Brief description of the feature -->

## Acceptance criteria

- [ ] First acceptance criterion

## Open questions

> Open question: Any unresolved questions go here
`,
  )
}
