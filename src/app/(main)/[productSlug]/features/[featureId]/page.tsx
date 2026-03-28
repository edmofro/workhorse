import { notFound } from 'next/navigation'
import { prisma } from '../../../../../lib/prisma'
import { CardTab } from '../../../../../components/feature/CardTab'

interface Props {
  params: Promise<{ featureId: string }>
}

export default async function FeatureCardPage({ params }: Props) {
  const { featureId } = await params

  const feature = await prisma.feature.findUnique({
    where: { identifier: featureId },
    include: {
      team: { include: { product: true } },
      assignee: true,
      dependsOn: { include: { parent: true } },
      dependedOnBy: { include: { dependent: true } },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: true },
      },
    },
  })

  if (!feature) notFound()

  // Get all users for assignee picker
  const users = await prisma.user.findMany({ orderBy: { displayName: 'asc' } })
  const teams = await prisma.team.findMany({
    where: { productId: feature.team.productId },
    orderBy: { name: 'asc' },
  })

  return (
    <CardTab
      feature={{
        id: feature.id,
        identifier: feature.identifier,
        title: feature.title,
        description: feature.description,
        status: feature.status,
        priority: feature.priority,
        tags: feature.tags,
        team: { id: feature.team.id, name: feature.team.name, colour: feature.team.colour },
        assignee: feature.assignee
          ? { id: feature.assignee.id, displayName: feature.assignee.displayName }
          : null,
        dependsOn: feature.dependsOn.map((d) => ({
          identifier: d.parent.identifier,
          title: d.parent.title,
        })),
        activities: feature.activities.map((a) => ({
          id: a.id,
          action: a.action,
          details: a.details,
          createdAt: a.createdAt.toISOString(),
          user: a.user
            ? { displayName: a.user.displayName }
            : null,
        })),
      }}
      users={users.map((u) => ({ id: u.id, displayName: u.displayName }))}
      teams={teams.map((t) => ({ id: t.id, name: t.name, colour: t.colour }))}
    />
  )
}
