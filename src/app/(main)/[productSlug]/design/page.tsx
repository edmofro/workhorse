import { notFound } from 'next/navigation'
import { prisma } from '../../../../lib/prisma'
import { Topbar, TopbarTitle } from '../../../../components/Topbar'
import { DesignBrowser } from '../../../../components/design/DesignBrowser'

interface Props {
  params: Promise<{ productSlug: string }>
}

export default async function DesignPage({ params }: Props) {
  const { productSlug } = await params

  const allProducts = await prisma.product.findMany()
  const product = allProducts.find(
    (p) => p.name.toLowerCase() === decodeURIComponent(productSlug).toLowerCase(),
  )

  if (!product) notFound()

  return (
    <>
      <Topbar>
        <TopbarTitle>Design — {product.name}</TopbarTitle>
      </Topbar>
      <DesignBrowser
        owner={product.owner}
        repoName={product.repoName}
        defaultBranch={product.defaultBranch}
      />
    </>
  )
}
