import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProducts } from '../../lib/actions/products'

export default async function HomePage() {
  const products = await getProducts()

  if (products.length > 0) {
    redirect(`/${encodeURIComponent(products[0].name.toLowerCase())}`)
  }

  // No products yet — show empty state prompting to create one
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-[320px]">
        <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-2">
          No products yet
        </h2>
        <p className="text-[13px] text-[var(--text-muted)] mb-4">
          Add a product in settings to get started.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center px-[14px] py-[7px] rounded-[var(--radius-default)] text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors duration-100"
        >
          Go to settings
        </Link>
      </div>
    </div>
  )
}
