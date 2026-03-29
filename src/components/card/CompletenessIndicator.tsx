import { analyseCompleteness } from '../../lib/ai/completenessCheck'

interface CompletenessIndicatorProps {
  specContent: string
}

export function CompletenessIndicator({ specContent }: CompletenessIndicatorProps) {
  const result = analyseCompleteness(specContent)

  if (result.totalCriteria === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-[12px] text-[var(--text-muted)]">
          {result.confirmedCriteria} of {result.totalCriteria} criteria confirmed
        </span>
        {result.openQuestions > 0 && (
          <span className="text-[12px] text-[var(--amber)]">
            {result.openQuestions} open question{result.openQuestions > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Section breakdown */}
      {result.sections.length > 1 && (
        <div className="space-y-1">
          {result.sections.map((section) => (
            <div key={section.name} className="flex items-center gap-2 text-[11px]">
              <span
                className="w-[8px] h-[8px] rounded-full shrink-0"
                style={{
                  background:
                    section.confirmed === section.total
                      ? 'var(--green)'
                      : section.confirmed > 0
                        ? 'var(--amber)'
                        : 'var(--border-default)',
                }}
              />
              <span className="text-[var(--text-muted)] w-[140px] truncate">
                {section.name}
              </span>
              <span className="text-[var(--text-faint)]">
                {section.confirmed} of {section.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
