import { analyseCompleteness } from '../../lib/ai/completenessCheck'

interface CompletenessIndicatorProps {
  specContent: string
}

export function CompletenessIndicator({ specContent }: CompletenessIndicatorProps) {
  const result = analyseCompleteness(specContent)

  if (result.totalCriteria === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[var(--text-muted)]">
          {result.confirmedCriteria}/{result.totalCriteria} criteria confirmed
        </span>
        {result.openQuestions > 0 && (
          <span className="text-[12px] text-[var(--amber)]">
            {result.openQuestions} open question{result.openQuestions > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-[4px] bg-[var(--bg-inset)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{
            width: `${result.score}%`,
            background:
              result.score >= 80
                ? 'var(--green)'
                : result.score >= 50
                  ? 'var(--amber)'
                  : 'var(--border-default)',
          }}
        />
      </div>

      {/* Section breakdown */}
      {result.sections.length > 1 && (
        <div className="space-y-1">
          {result.sections.map((section) => (
            <div key={section.name} className="flex items-center gap-2 text-[11px]">
              <span className="text-[var(--text-muted)] w-[140px] truncate">
                {section.name}
              </span>
              <span className="text-[var(--text-faint)]">
                {section.confirmed}/{section.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
