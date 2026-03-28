/**
 * Completeness tracking — analyse spec coverage
 */

export interface CompletenessResult {
  totalCriteria: number
  confirmedCriteria: number
  openQuestions: number
  sections: {
    name: string
    total: number
    confirmed: number
  }[]
  score: number // 0-100
}

/**
 * Analyse spec content for completeness metrics
 */
export function analyseCompleteness(specContent: string): CompletenessResult {
  const lines = specContent.split('\n')
  let totalCriteria = 0
  let confirmedCriteria = 0
  let openQuestions = 0
  const sections: CompletenessResult['sections'] = []
  let currentSection = 'General'
  let sectionTotal = 0
  let sectionConfirmed = 0

  for (const line of lines) {
    // Track sections
    const h2Match = line.match(/^## (.+)$/)
    if (h2Match) {
      if (sectionTotal > 0) {
        sections.push({ name: currentSection, total: sectionTotal, confirmed: sectionConfirmed })
      }
      currentSection = h2Match[1]
      sectionTotal = 0
      sectionConfirmed = 0
      continue
    }

    // Count criteria
    const checkedMatch = line.match(/^\s*-\s*\[x\]/i)
    const uncheckedMatch = line.match(/^\s*-\s*\[\s*\]/)

    if (checkedMatch) {
      totalCriteria++
      confirmedCriteria++
      sectionTotal++
      sectionConfirmed++
    } else if (uncheckedMatch) {
      totalCriteria++
      sectionTotal++
    }

    // Count open questions
    if (line.match(/^>\s*(?:Open question|TODO|TBD)/i)) {
      openQuestions++
    }
  }

  // Push last section
  if (sectionTotal > 0) {
    sections.push({ name: currentSection, total: sectionTotal, confirmed: sectionConfirmed })
  }

  const score =
    totalCriteria > 0
      ? Math.round((confirmedCriteria / totalCriteria) * 100)
      : 0

  return {
    totalCriteria,
    confirmedCriteria,
    openQuestions,
    sections,
    score,
  }
}
