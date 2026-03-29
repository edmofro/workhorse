'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Topbar, TopbarCardTitle, TopbarRight } from '../Topbar'
import { CollaborateButton } from './CollaborateButton'

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
        </TopbarRight>
      </Topbar>
      {children}
    </>
  )
}
