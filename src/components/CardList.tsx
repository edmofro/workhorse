import { StatusDot } from './StatusDot'
import { CardItem } from './CardItem'

interface CardData {
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

interface CardListProps {
  cards: CardData[]
  projectName: string
}

const STATUS_GROUPS = [
  { key: 'SPECIFYING', label: 'Specifying', dotState: 'specifying' as const },
  { key: 'IMPLEMENTING', label: 'Implementing', dotState: 'implementing' as const },
  { key: 'NOT_STARTED', label: 'Not started', dotState: 'not-started' as const },
  { key: 'COMPLETE', label: 'Complete', dotState: 'complete' as const },
] as const

export function CardList({ cards, projectName }: CardListProps) {
  if (cards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[14px] text-[var(--text-muted)] mb-1">No cards yet</p>
          <p className="text-[13px] text-[var(--text-faint)]">
            Create your first card to get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: '28px 32px' }}>
      {STATUS_GROUPS.map((group) => {
        const groupCards = cards.filter((c) => c.status === group.key)
        if (groupCards.length === 0) return null

        return (
          <div key={group.key} style={{ marginBottom: '32px' }}>
            <div className="flex items-center gap-2 mb-3 px-[2px]">
              <StatusDot state={group.dotState} />
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">{group.label}</span>
              <span className="text-xs text-[var(--text-muted)]">
                {groupCards.length}
              </span>
            </div>
            {groupCards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                projectName={projectName}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
