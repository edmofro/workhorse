/**
 * Safely parse the touchedFiles JSON string from a card.
 * Returns an empty array if the value is invalid.
 */
export function safeParseTouchedFiles(touchedFiles: string): string[] {
  try {
    const parsed = JSON.parse(touchedFiles)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
