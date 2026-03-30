/** Canonical path prefix for mockup files within the workhorse directory. */
export const MOCKUP_PATH_PREFIX = '.workhorse/design/mockups/'

/** Returns true if the given file path is a mockup (lives under .workhorse/design/mockups/). */
export function isMockupPath(filePath: string): boolean {
  return filePath.startsWith(MOCKUP_PATH_PREFIX)
}
