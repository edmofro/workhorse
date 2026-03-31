'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { Avatar } from './Avatar'
import { Tag } from './Tag'
import { DeleteCardDialog } from './DeleteCardDialog'

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
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const tags: string[] = (() => {
    try {
      return JSON.parse(card.tags)
    } catch {
      return []
    }
  })()

  const href = `/${encodeURIComponent(projectName.toLowerCase())}/cards/${card.identifier}`

  return (
    <>
      <div className="relative group" style={{ marginBottom: '8px' }}>
        <Link
          href={href}
          className="block bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] cursor-pointer transition-[border-color,box-shadow] duration-100 hover:border-[var(--border-default)] hover:shadow-[var(--shadow-md)]"
          style={{ padding: '16px 18px' }}
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
        </Link>

        {/* ⋯ button — visible on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenuOpen((prev) => !prev)
            }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors duration-100 cursor-pointer"
          >
            <MoreHorizontal size={14} />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                }}
              />
              <div className="absolute right-0 top-7 z-20 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-[152px] p-1">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setMenuOpen(false)
                    setShowDeleteDialog(true)
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-[7px] rounded-md text-[13px] text-[#dc2626] hover:bg-[rgba(220,38,38,0.06)] transition-colors duration-100 cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete card
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showDeleteDialog && (
        <DeleteCardDialog
          cardId={card.id}
          cardTitle={card.title}
          onCancel={() => setShowDeleteDialog(false)}
          onDeleted={() => {
            setShowDeleteDialog(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
