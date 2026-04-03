'use client'

import { useState, useRef, useEffect, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { MoreHorizontal, ChevronRight } from 'lucide-react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { cn } from '../lib/cn'
import { StatusDot } from './StatusDot'
import { Avatar } from './Avatar'
import { Tag } from './Tag'
import { updateCard } from '../lib/actions/cards'
import { STATUS_OPTIONS } from '../lib/status'

export interface CardData {
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

type StatusDotState = 'not-started' | 'specifying' | 'implementing' | 'complete' | 'cancelled'

interface BoardColumnProps {
  label: string
  dotState: StatusDotState
  cards: CardData[]
  projectName: string
  statusKey: string
}

export function BoardColumn({ label, dotState, cards, projectName, statusKey }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${statusKey}`,
    data: { type: 'column', status: statusKey },
  })

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

      {/* Card stack — droppable zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto px-2 pb-4 space-y-2 rounded-[var(--radius-lg)] transition-colors duration-100',
          isOver && 'bg-[var(--bg-hover)]',
        )}
      >
        {cards.length === 0 ? (
          <div className="flex items-center justify-center py-8 rounded-[var(--radius-lg)]">
            <span className="text-[12px] text-[var(--text-faint)]">No cards</span>
          </div>
        ) : (
          cards.map((card) => (
            <DraggableBoardCard key={card.id} card={card} projectName={projectName} />
          ))
        )}
      </div>
    </div>
  )
}

/** Draggable wrapper around BoardCard using dnd-kit useDraggable */
function DraggableBoardCard({ card, projectName }: { card: CardData; projectName: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: card.id,
    data: { type: 'card', card },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(isDragging && 'opacity-30')}
      {...attributes}
      {...listeners}
    >
      <BoardCard card={card} projectName={projectName} isDragging={isDragging} />
    </div>
  )
}

/** Shared card content used by both inline cards and the drag overlay */
function CardContent({ card }: { card: CardData }) {
  const tags = useMemo(() => {
    try { return JSON.parse(card.tags) as string[] } catch { return [] }
  }, [card.tags])

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-[var(--text-muted)] font-mono font-medium">
          {card.identifier}
        </span>
      </div>
      <div className={cn(
        'text-[14px] font-medium leading-[1.4] text-[var(--text-primary)]',
        card.status === 'CANCELLED' && 'line-through text-[var(--text-muted)]',
      )}>
        {card.title}
      </div>
      {(tags.length > 0 || card.assignee) && (
        <div className="flex items-center gap-2 mt-2">
          {tags.map((tag) => (
            <Tag key={tag} variant={tag === 'future' ? 'future' : 'core'}>
              {tag}
            </Tag>
          ))}
          {card.assignee && (
            <div className="ml-auto">
              <Avatar variant="human" initial={card.assignee.displayName} size="sm" />
            </div>
          )}
        </div>
      )}
    </>
  )
}

/** Card overlay shown during drag */
export function BoardCardOverlay({ card }: { card: CardData }) {
  return (
    <div
      className={cn(
        'block bg-[var(--bg-surface)] border border-[var(--border-default)]',
        'rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]',
        'py-3 px-4 w-[260px] cursor-grabbing',
        card.status === 'CANCELLED' && 'opacity-60',
      )}
    >
      <CardContent card={card} />
    </div>
  )
}

function BoardCard({ card, projectName, isDragging }: { card: CardData; projectName: string; isDragging?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [statusSubmenuOpen, setStatusSubmenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [, startTransition] = useTransition()

  const href = `/${encodeURIComponent(projectName.toLowerCase())}/cards/${card.identifier}`

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setStatusSubmenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  function handleStatusChange(status: string) {
    setMenuOpen(false)
    setStatusSubmenuOpen(false)
    startTransition(async () => {
      try {
        await updateCard(card.id, { status })
      } catch (error) {
        console.error('Failed to update card status:', error)
        setMenuOpen(true)
      }
    })
  }

  return (
    <div className="relative group">
      <Link
        href={href}
        className={cn(
          'block bg-[var(--bg-surface)] border border-[var(--border-subtle)]',
          'rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]',
          'cursor-pointer transition-[border-color,box-shadow] duration-100',
          'hover:border-[var(--border-default)] hover:shadow-[var(--shadow-md)]',
          'py-3 px-4',
          card.status === 'CANCELLED' && 'opacity-60',
          isDragging && 'invisible',
        )}
        onClick={(e) => {
          if (isDragging) e.preventDefault()
        }}
        draggable={false}
      >
        <CardContent card={card} />
      </Link>

      {/* Overflow menu trigger */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setMenuOpen(!menuOpen)
          setStatusSubmenuOpen(false)
        }}
        className={cn(
          'absolute top-2 right-2 p-1 rounded-[var(--radius-md)]',
          'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
          'transition-[color,background-color,opacity] duration-100 cursor-pointer',
          menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <MoreHorizontal size={14} />
      </button>

      {/* Overflow menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-8 right-2 z-50 w-[160px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] py-1"
        >
          <div
            className="relative pr-1"
            onMouseEnter={() => setStatusSubmenuOpen(true)}
            onMouseLeave={() => setStatusSubmenuOpen(false)}
          >
            <button
              className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer flex items-center justify-between"
              onClick={() => setStatusSubmenuOpen(!statusSubmenuOpen)}
            >
              Status
              <ChevronRight size={12} className="text-[var(--text-faint)]" />
            </button>

            {/* Status submenu */}
            {statusSubmenuOpen && (
              <div className="absolute left-full top-0 w-[152px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] py-1">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer',
                      card.status === opt.value ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
