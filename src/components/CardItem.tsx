import Link from 'next/link'
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

interface CardItemProps {
  card: CardData
  projectName: string
}

export function CardItem({ card, projectName }: CardItemProps) {
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
      className="block bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] cursor-pointer transition-[border-color,box-shadow] duration-100 hover:border-[var(--border-default)] hover:shadow-[var(--shadow-md)]"
      style={{ padding: '16px 18px', marginBottom: '8px' }}
    >
      <div
        className="text-xs text-[var(--text-muted)] font-mono font-medium"
        style={{ marginBottom: '4px' }}
      >
        {card.identifier}
      </div>
      <div className="text-[14px] font-medium leading-[1.4]">{card.title}</div>
      {card.description && (
        <div
          className="text-[13px] text-[var(--text-secondary)] leading-[1.5]"
          style={{ marginTop: '4px' }}
        >
          {card.description.length > 120
            ? `${card.description.slice(0, 120)}...`
            : card.description}
        </div>
      )}
      <div className="flex items-center gap-2" style={{ marginTop: '12px' }}>
        {tags.map((tag) => (
          <Tag
            key={tag}
            variant={tag === 'future' ? 'future' : 'core'}
          >
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
    </Link>
  )
}
