import { notFound } from 'next/navigation'
import { prisma } from '../../../../../lib/prisma'
import { CardDetailShell } from '../../../../../components/card/CardDetailShell'

interface Props {
  params: Promise<{ projectSlug: string; cardId: string }>
  children: React.ReactNode
}

export default async function CardLayout({ params, children }: Props) {
  const { projectSlug, cardId } = await params

  const card = await prisma.card.findUnique({
    where: { identifier: cardId },
    include: {
      team: { include: { project: true } },
      assignee: true,
      specs: { select: { content: true, committedContent: true } },
    },
  })

  if (!card) notFound()

  const hasSpecs = card.specs.length > 0
  const specsDirty = card.specs.some(
    (s) => s.committedContent === null || s.content !== s.committedContent,
  )

  return (
    <CardDetailShell
      card={{
        id: card.id,
        identifier: card.identifier,
        title: card.title,
        status: card.status,
        prUrl: card.prUrl,
        hasSpecs,
        specsDirty,
      }}
      projectSlug={projectSlug}
    >
      {children}
    </CardDetailShell>
  )
}
