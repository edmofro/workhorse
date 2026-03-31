'use client'

import { useState } from 'react'
import { ArrowLeft, MoreVertical, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Topbar, TopbarCardTitle, TopbarRight } from '../Topbar'
import { CollaborateButton } from './CollaborateButton'
import { DeleteCardDialog } from '../DeleteCardDialog'

interface CardDetailShellProps {
  card: {
    id: string
    identifier: string
    title: string
    status: string
    cardBranch: string | null
    touchedFiles: string[]
    defaultBranch: string
  }
  projectSlug: string
  children: React.ReactNode
}

export function CardDetailShell({
  card,
  projectSlug,
  children,
}: CardDetailShellProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  return (
    <>
      <Topbar>
        <Link
          href={`/${projectSlug}`}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100"
        >
          <ArrowLeft size={16} />
        </Link>
        <TopbarCardTitle
          title={card.title}
          identifier={card.identifier}
        />
        <TopbarRight>
          <CollaborateButton
            cardId={card.id}
            cardBranch={card.cardBranch}
            status={card.status}
          />

          {/* ⋯ menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-colors duration-100 cursor-pointer"
            >
              <MoreVertical size={14} />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-9 z-20 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-[152px] p-1">
                  <button
                    onClick={() => {
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
        </TopbarRight>
      </Topbar>
      {children}

      {showDeleteDialog && (
        <DeleteCardDialog
          cardId={card.id}
          cardTitle={card.title}
          onCancel={() => setShowDeleteDialog(false)}
          onDeleted={() => {
            setShowDeleteDialog(false)
            router.push(`/${projectSlug}`)
          }}
        />
      )}
    </>
  )
}
