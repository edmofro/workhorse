/**
 * Human-readable label derivation for specs, mockups, and design library files.
 *
 * Label derivation rule:
 * - Specs: frontmatter `title` → humanised filename fallback
 * - HTML files: `<title>` element → humanised filename fallback
 * - Humanised filename: strip extension, replace hyphens/underscores with spaces, sentence-case
 */

/**
 * Convert a filename (or directory name) to a human-readable label.
 * Strips the extension, replaces hyphens/underscores with spaces, sentence-cases.
 *
 * Examples:
 *   "login-screen.html" → "Login screen"
 *   "patient-registration.html" → "Patient registration"
 *   "recurring-appointments.md" → "Recurring appointments"
 *   "patient" → "Patient"
 */
export function humaniseFilename(filename: string): string {
  // Strip extension
  const withoutExt = filename.replace(/\.[^.]+$/, '')
  // Replace hyphens and underscores with spaces
  const spaced = withoutExt.replace(/[-_]+/g, ' ')
  // Sentence case: capitalise first letter, lowercase rest
  const trimmed = spaced.trim()
  if (!trimmed) return filename
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

/**
 * Extract the `<title>` element text from an HTML string.
 * Returns null if no title is found or it's empty.
 */
export function extractHtmlTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = match?.[1]?.trim()
  return title || null
}

/**
 * Derive a human-readable label for a spec file.
 *
 * Uses frontmatter title if available (via parseSpec), falls back to humanised filename.
 */
export function deriveSpecLabel(filePath: string, content?: string): string {
  if (content) {
    const titleMatch = content.match(/^---\n[\s\S]*?^title:\s*["']?(.+?)["']?\s*$/m)
    if (titleMatch?.[1]) return titleMatch[1]
  }
  const filename = filePath.split('/').pop() ?? filePath
  return humaniseFilename(filename)
}

/**
 * Derive a human-readable label for an HTML file (mockup, design component/view).
 *
 * Uses `<title>` element if available, falls back to humanised filename.
 */
export function deriveHtmlLabel(filePath: string, content?: string): string {
  if (content) {
    const title = extractHtmlTitle(content)
    if (title) return title
  }
  const filename = filePath.split('/').pop() ?? filePath
  return humaniseFilename(filename)
}

/**
 * Derive label for any file based on its extension.
 * Routes to the appropriate strategy (spec vs HTML).
 */
export function deriveLabel(filePath: string, content?: string): string {
  if (filePath.endsWith('.html') || filePath.endsWith('.htm')) {
    return deriveHtmlLabel(filePath, content)
  }
  return deriveSpecLabel(filePath, content)
}

/**
 * Check if a search query matches either the derived label or the raw filename.
 */
export function matchesSearch(query: string, filePath: string, label: string): boolean {
  const lowerQuery = query.toLowerCase()
  const filename = filePath.split('/').pop() ?? filePath
  return (
    label.toLowerCase().includes(lowerQuery) ||
    filename.toLowerCase().includes(lowerQuery)
  )
}
