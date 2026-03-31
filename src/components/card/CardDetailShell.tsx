'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Topbar, TopbarCardTitle, TopbarRight } from '../Topbar'
import { CollaborateButton } from './CollaborateButton'
import { ActivityPopover } from './ActivityPopover'
import { useCardBack } from './CardBackContext'

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
  activities: {
    id: string
    action: string
    details: string | null
    createdAt: string
    user: { displayName: string } | null
  }[]
  projectSlug: string
  children: React.ReactNode
}

export function CardDetailShell({
  card,
  activities,
  projectSlug,
  children,
}: CardDetailShellProps) {
  const onBack = useCardBack()
  return (
    <>
      <Topbar>
        {onBack ? (
          <button
            onClick={onBack}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
        ) : (
          <Link
            href={`/${projectSlug}`}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100"
          >
            <ArrowLeft size={16} />
          </Link>
        )}
        <TopbarCardTitle
          title={card.title}
          identifier={card.identifier}
        />
        <TopbarRight>
          <ActivityPopover activities={activities} />
          <CollaborateButton
            cardId={card.id}
            cardBranch={card.cardBranch}
            status={card.status}
          />
        </TopbarRight>
      </Topbar>
      {children}
    </>
  )
}
