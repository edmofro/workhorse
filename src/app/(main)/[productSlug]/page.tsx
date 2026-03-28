import { notFound } from 'next/navigation'
import { prisma } from '../../../lib/prisma'
import { Topbar, TopbarTitle, TopbarRight } from '../../../components/Topbar'
import { FeatureList } from '../../../components/FeatureList'
import { CreateFeatureDialog } from '../../../components/CreateFeatureDialog'
import { FeatureFilter } from '../../../components/FeatureFilter'

interface Props {
  params: Promise<{ productSlug: string }>
  searchParams: Promise<{ team?: string; status?: string; assignee?: string }>
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { productSlug } = await params
  const { team: teamFilter, status: statusFilter, assignee: assigneeFilter } = await searchParams

  // Find product (case-insensitive)
  const allProducts = await prisma.product.findMany()
  const matchedProduct = allProducts.find(
    (p) => p.name.toLowerCase() === decodeURIComponent(productSlug).toLowerCase(),
  )
  if (!matchedProduct) notFound()

  const product = await prisma.product.findUnique({
    where: { id: matchedProduct.id },
    include: {
      teams: {
        include: {
          features: {
            include: { assignee: true, team: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  })
  if (!product) notFound()

  const allFeatures = product.teams.flatMap((t) => t.features)
  const users = await prisma.user.findMany({ orderBy: { displayName: 'asc' } })

  // Apply filters
  let features = allFeatures
  if (teamFilter) features = features.filter((f) => f.team.id === teamFilter)
  if (statusFilter) features = features.filter((f) => f.status === statusFilter)
  if (assigneeFilter) features = features.filter((f) => f.assignee?.id === assigneeFilter)

  const productPath = `/${encodeURIComponent(product.name.toLowerCase())}`

  return (
    <>
      <Topbar>
        <TopbarTitle>Features</TopbarTitle>
        <TopbarRight>
          <FeatureFilter
            teams={product.teams.map((t) => ({
              id: t.id,
              name: t.name,
              colour: t.colour,
            }))}
            users={users.map((u) => ({ id: u.id, displayName: u.displayName }))}
            basePath={productPath}
          />
          <CreateFeatureDialog
            teams={product.teams.map((t) => ({
              id: t.id,
              name: t.name,
              colour: t.colour,
            }))}
            productName={product.name}
          />
        </TopbarRight>
      </Topbar>
      <FeatureList features={features} productName={product.name} />
    </>
  )
}
