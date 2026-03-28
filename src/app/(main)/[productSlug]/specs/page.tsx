import { notFound } from 'next/navigation'
import { prisma } from '../../../../lib/prisma'
import { Topbar, TopbarTitle } from '../../../../components/Topbar'
import { SpecExplorer } from '../../../../components/specs/SpecExplorer'

interface Props {
  params: Promise<{ productSlug: string }>
}

export default async function ProductSpecsPage({ params }: Props) {
  const { productSlug } = await params

  // Case-insensitive product lookup (consistent with other product pages)
  const allProducts = await prisma.product.findMany()
  const product = allProducts.find(
    (p) => p.name.toLowerCase() === decodeURIComponent(productSlug).toLowerCase(),
  )
  if (!product) notFound()

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
