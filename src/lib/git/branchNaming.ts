/**
 * Deterministic branch naming from card ID
 */

export function branchNameFromCard(identifier: string, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

  return `workhorse/${identifier.toLowerCase()}/${slug}`
}

export function branchNameFromParent(
  parentBranch: string,
  childIdentifier: string,
  childTitle: string,
): string {
  const childSlug = childTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)

  return `${parentBranch}+${childIdentifier.toLowerCase()}-${childSlug}`
}
