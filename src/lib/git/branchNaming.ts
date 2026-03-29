/**
 * Deterministic branch naming from card ID.
 * Branch format: workhorse/{identifier}-spec
 */

export function branchNameFromCard(identifier: string): string {
  return `workhorse/${identifier.toLowerCase()}-spec`
}

export function branchNameFromParent(
  parentBranch: string,
  childIdentifier: string,
): string {
  return `${parentBranch}+${childIdentifier.toLowerCase()}`
}
