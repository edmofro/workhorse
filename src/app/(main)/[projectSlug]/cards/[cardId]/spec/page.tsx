import { notFound } from 'next/navigation'
import { prisma } from '../../../../../../lib/prisma'
import { SpecTab } from '../../../../../../components/card/SpecTab'

interface Props {
  params: Promise<{ cardId: string }>
}

export default async function SpecPage({ params }: Props) {
  const { cardId } = await params

  const card = await prisma.card.findUnique({
    where: { identifier: cardId },
    include: {
      specs: { orderBy: { filePath: 'asc' } },
      specMessages: {
        orderBy: { createdAt: 'asc' },
        include: { user: true },
        where: { role: { in: ['user', 'assistant'] } },
      },
      team: { include: { project: true } },
    },
  })

  if (!card) notFound()

  return (
    <SpecTab
      card={{
        id: card.id,
        identifier: card.identifier,
        title: card.title,
      }}
      specs={card.specs.map((s) => ({
        id: s.id,
        filePath: s.filePath,
        isNew: s.isNew,
        content: s.content,
        baselineContent: s.baselineContent,
      }))}
      messages={card.specMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        userName: m.user?.displayName,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  )
}
