/**
 * Detect and extract mockup blocks from AI responses
 */

export interface DetectedMockup {
  title: string
  html: string
  startIndex: number
  endIndex: number
}

/**
 * Extract mockup blocks from AI response content
 * Format: ```mockup\ntitle: Title\n---\n<html>\n```
 */
export function detectMockups(content: string): DetectedMockup[] {
  const mockups: DetectedMockup[] = []
  const regex = /```mockup\n([\s\S]*?)```/g

  let match
  while ((match = regex.exec(content)) !== null) {
    const block = match[1].trim()
    const lines = block.split('\n')
    let title = 'Untitled mockup'
    let htmlStartIdx = 0

    // Parse title line
    const titleMatch = lines[0]?.match(/^title:\s*(.+)/)
    if (titleMatch) {
      title = titleMatch[1].trim()
      htmlStartIdx = 1
      if (lines[htmlStartIdx] === '---') htmlStartIdx = 2
    }

    const html = lines.slice(htmlStartIdx).join('\n')

    mockups.push({
      title,
      html,
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  return mockups
}

/**
 * Extract spec blocks from AI response content
 */
export interface DetectedSpec {
  title: string
  content: string
}

export function detectSpecs(content: string): DetectedSpec[] {
  const specs: DetectedSpec[] = []
  const regex = /```spec\n([\s\S]*?)```/g

  let match
  while ((match = regex.exec(content)) !== null) {
    const block = match[1].trim()
    const lines = block.split('\n')
    let title = 'Untitled section'
    let contentStartIdx = 0

    // Parse optional frontmatter
    if (lines[0] === '---') {
      const endIdx = lines.indexOf('---', 1)
      if (endIdx > 0) {
        const frontmatter = lines.slice(1, endIdx).join('\n')
        const titleMatch = frontmatter.match(/title:\s*(.+)/)
        if (titleMatch) title = titleMatch[1].trim()
        contentStartIdx = endIdx + 1
      }
    }

    specs.push({
      title,
      content: lines.slice(contentStartIdx).join('\n').trim(),
    })
  }

  return specs
}
