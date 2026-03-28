import Link from 'next/link'
import { Avatar } from './Avatar'
import { Tag } from './Tag'

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

interface FeatureCardProps {
  feature: Feature
  productName: string
}

export function FeatureCard({ feature, productName }: FeatureCardProps) {
  const tags: string[] = (() => {
    try {
      return JSON.parse(feature.tags)
    } catch {
      return []
    }
  })()

  const href = `/${encodeURIComponent(productName.toLowerCase())}/features/${feature.identifier}`

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
        {feature.identifier}
      </div>
      <div className="text-[14px] font-medium leading-[1.4]">{feature.title}</div>
      {feature.description && (
        <div
          className="text-[13px] text-[var(--text-muted)] leading-[1.5]"
          style={{ marginTop: '4px' }}
        >
          {feature.description.length > 120
            ? `${feature.description.slice(0, 120)}...`
            : feature.description}
        </div>
      )}
      <div className="flex items-center gap-2" style={{ marginTop: '10px' }}>
        {tags.map((tag) => (
          <Tag
            key={tag}
            variant={tag === 'future' ? 'future' : 'core'}
          >
            {tag}
          </Tag>
        ))}
        {feature.assignee && (
          <div className="ml-auto">
            <Avatar
              variant="human"
              initial={feature.assignee.displayName}
              size="sm"
            />
          </div>
        )}
      </div>
    </Link>
  )
}
