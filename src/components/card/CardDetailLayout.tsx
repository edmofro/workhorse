'use client'

import { useCardDetail } from '../../lib/hooks/queries'
import { CardDetailShell } from './CardDetailShell'

interface Props {
  projectSlug: string
  cardId: string
  children: React.ReactNode
}

export function CardDetailLayout({ projectSlug, cardId, children }: Props) {
  const { data } = useCardDetail(cardId)

  if (!data) {
    // Still loading — children will show their own loading state
    return <>{children}</>
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
