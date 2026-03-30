'use client'

import { notFound } from 'next/navigation'
import { useCardDetail, NotFoundError } from '../../lib/hooks/queries'
import { CardDetailShell } from './CardDetailShell'
import { Topbar } from '../Topbar'
import { Skeleton } from '../Skeleton'

interface Props {
  projectSlug: string
  cardId: string
  children: React.ReactNode
}

export function CardDetailLayout({ projectSlug, cardId, children }: Props) {
  const { data, error } = useCardDetail(cardId)

  if (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }

  if (!data) {
    // Show skeleton topbar so layout doesn't shift when data arrives
    return (
      <>
        <Topbar>
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </Topbar>
        {children}
      </>
    )
  }

  const { card } = data

  return (
    <CardDetailShell
      card={{
        id: card.id,
        identifier: card.identifier,
        title: card.title,
        status: card.status,
        cardBranch: card.cardBranch,
        touchedFiles: card.touchedFiles,
        defaultBranch: card.project.defaultBranch,
      }}
      projectSlug={projectSlug}
    >
      {children}
    </CardDetailShell>
  )
}
