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
    },
  })

  if (!card) notFound()

  let touchedFiles: string[] = []
  try {
    const parsed = JSON.parse(card.touchedFiles)
    touchedFiles = Array.isArray(parsed) ? parsed : []
  } catch {
    // Ignore corrupted touchedFiles
  }

  return (
    <CardDetailShell
      card={{
        id: card.id,
        identifier: card.identifier,
        title: card.title,
        status: card.status,
        cardBranch: card.cardBranch,
        touchedFiles,
        defaultBranch: card.team.project.defaultBranch,
      }}
      projectSlug={projectSlug}
    >
      {children}
    </CardDetailShell>
  )
}
