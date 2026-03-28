import { notFound } from 'next/navigation'
import { prisma } from '../../../../../lib/prisma'
import { FeatureDetailShell } from '../../../../../components/feature/FeatureDetailShell'

interface Props {
  params: Promise<{ productSlug: string; featureId: string }>
  children: React.ReactNode
}

export default async function FeatureLayout({ params, children }: Props) {
  const { productSlug, featureId } = await params

  const feature = await prisma.feature.findUnique({
    where: { identifier: featureId },
    include: {
      team: { include: { product: true } },
      assignee: true,
      specs: { select: { content: true, committedContent: true } },
    },
  })

  if (!feature) notFound()

  const hasSpecs = feature.specs.length > 0
  const specsDirty = feature.specs.some(
    (s) => s.committedContent === null || s.content !== s.committedContent,
  )

  return (
    <FeatureDetailShell
      feature={{
        id: feature.id,
        identifier: feature.identifier,
        title: feature.title,
        status: feature.status,
        prUrl: feature.prUrl,
        specBranch: feature.specBranch,
        hasSpecs,
        specsDirty,
      }}
      productSlug={productSlug}
    >
      {children}
    </FeatureDetailShell>
  )
}
