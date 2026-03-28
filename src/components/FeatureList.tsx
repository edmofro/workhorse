import { StatusDot } from './StatusDot'
import { FeatureCard } from './FeatureCard'

interface Feature {
  id: string
  identifier: string
  title: string
  description: string | null
  status: string
  priority: string
  tags: string
  assignee: { id: string; displayName: string } | null
  team: { id: string; name: string; colour: string }
}

interface FeatureListProps {
  features: Feature[]
  productName: string
}

const STATUS_GROUPS = [
  { key: 'SPECIFYING', label: 'In progress', dotState: 'specifying' as const },
  { key: 'NOT_STARTED', label: 'Not started', dotState: 'not-started' as const },
  { key: 'SPEC_COMPLETE', label: 'Spec complete', dotState: 'complete' as const },
] as const

export function FeatureList({ features, productName }: FeatureListProps) {
  if (features.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] text-[var(--text-muted)] mb-1">No features yet</p>
          <p className="text-[13px] text-[var(--text-faint)]">
            Create your first feature to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: '28px 32px' }}>
      {STATUS_GROUPS.map((group) => {
        const groupFeatures = features.filter((f) => f.status === group.key)
        if (groupFeatures.length === 0) return null

        return (
          <div key={group.key} style={{ marginBottom: '32px' }}>
            <div className="flex items-center gap-2 mb-3 px-[2px]">
              <StatusDot state={group.dotState} />
              <span className="text-[13px] font-semibold">{group.label}</span>
              <span className="text-xs text-[var(--text-muted)]">
                {groupFeatures.length}
              </span>
            </div>
            {groupFeatures.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                productName={productName}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
