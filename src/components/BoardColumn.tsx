import Link from 'next/link'
import { StatusDot } from './StatusDot'
import { Avatar } from './Avatar'
import { Tag } from './Tag'

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

type StatusDotState = 'not-started' | 'specifying' | 'implementing' | 'complete'

interface BoardColumnProps {
  label: string
  dotState: StatusDotState
  cards: CardData[]
  projectName: string
}

export function BoardColumn({ label, dotState, cards, projectName }: BoardColumnProps) {
  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 pb-3 shrink-0">
        <StatusDot state={dotState} />
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
          {label}
        </span>
        <span className="text-[11px] text-[var(--text-muted)]">
          {cards.length}
        </span>
      </div>

      {/* Card stack */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-4 space-y-1.5">
        {cards.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-[12px] text-[var(--text-faint)]">No cards</span>
          </div>
        ) : (
          cards.map((card) => (
            <BoardCard key={card.id} card={card} projectName={projectName} />
          ))
        )}
      </div>
    </div>
  )
}

function BoardCard({ card, projectName }: { card: CardData; projectName: string }) {
  const tags: string[] = (() => {
    try {
      return JSON.parse(card.tags)
    } catch {
      return []
    }
  })()

  const href = `/${encodeURIComponent(projectName.toLowerCase())}/cards/${card.identifier}`

  return (
    <Link
      href={href}
      className="block bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] cursor-pointer transition-[border-color,box-shadow] duration-100 hover:border-[var(--border-default)] hover:shadow-[var(--shadow-md)] p-3"
    >
      <div className="text-[11px] text-[var(--text-muted)] font-mono font-medium mb-1">
        {card.identifier}
      </div>
      <div className="text-[13px] font-medium leading-[1.4]">{card.title}</div>
      {(tags.length > 0 || card.assignee) && (
        <div className="flex items-center gap-1.5 mt-2">
          {tags.map((tag) => (
            <Tag key={tag} variant={tag === 'future' ? 'future' : 'core'}>
              {tag}
            </Tag>
          ))}
          {card.assignee && (
            <div className="ml-auto">
              <Avatar
                variant="human"
                initial={card.assignee.displayName}
                size="sm"
              />
            </div>
          )}
        </div>
      )}
    </Link>
  )
}
