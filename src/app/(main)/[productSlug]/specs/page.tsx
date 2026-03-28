import { notFound } from 'next/navigation'
import { prisma } from '../../../../lib/prisma'
import { Topbar, TopbarTitle } from '../../../../components/Topbar'
import { SpecExplorer } from '../../../../components/specs/SpecExplorer'

interface Props {
  params: Promise<{ productSlug: string }>
}

export default async function ProductSpecsPage({ params }: Props) {
  const { productSlug } = await params

  const product = await prisma.product.findFirst({
    where: { name: { equals: decodeURIComponent(productSlug) } },
  })

  if (!product) {
    // Try case-insensitive
    const allProducts = await prisma.product.findMany()
    const match = allProducts.find(
      (p) => p.name.toLowerCase() === decodeURIComponent(productSlug).toLowerCase(),
    )
    if (!match) notFound()

    return renderPage(match)
  }

  return renderPage(product)
}

function renderPage(product: { id: string; name: string; owner: string; repoName: string; defaultBranch: string }) {
  return (
    <>
      <Topbar>
        <TopbarTitle>Specs — {product.name}</TopbarTitle>
      </Topbar>
      <SpecExplorer
        owner={product.owner}
        repoName={product.repoName}
        defaultBranch={product.defaultBranch}
      />
    </>
  )
}
