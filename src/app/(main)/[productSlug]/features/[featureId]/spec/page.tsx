import { notFound } from 'next/navigation'
import { prisma } from '../../../../../../lib/prisma'
import { SpecTab } from '../../../../../../components/feature/SpecTab'

interface Props {
  params: Promise<{ featureId: string }>
}

export default async function SpecPage({ params }: Props) {
  const { featureId } = await params

  const feature = await prisma.feature.findUnique({
    where: { identifier: featureId },
    include: {
      specs: { orderBy: { filePath: 'asc' } },
      specMessages: {
        orderBy: { createdAt: 'asc' },
        include: { user: true },
        where: { role: { in: ['user', 'assistant'] } },
      },
      team: { include: { product: true } },
    },
  })

  if (!feature) notFound()

  return (
    <SpecTab
      feature={{
        id: feature.id,
        identifier: feature.identifier,
        title: feature.title,
      }}
      specs={feature.specs.map((s) => ({
        id: s.id,
        filePath: s.filePath,
        isNew: s.isNew,
        content: s.content,
      }))}
      messages={feature.specMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        userName: m.user?.displayName,
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  )
}
