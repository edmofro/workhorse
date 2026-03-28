import { redirect } from 'next/navigation'
import { getCurrentUser } from '../../lib/auth/session'
import { getProducts } from '../../lib/actions/products'
import { filterAccessibleRepos } from '../../lib/auth/github'
import { UserProvider } from '../../components/UserProvider'
import { Sidebar } from '../../components/Sidebar'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const allProducts = await getProducts()

  // Filter products to only those the user has write access to
  const accessibleRepoKeys = await filterAccessibleRepos(
    user.accessToken,
    allProducts.map((p) => ({ owner: p.owner, repoName: p.repoName })),
  )

  const products = allProducts.filter((p) =>
    accessibleRepoKeys.has(`${p.owner}/${p.repoName}`),
  )

  const sidebarProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    teams: p.teams.map((t) => ({ id: t.id, name: t.name, colour: t.colour })),
  }))

  return (
    <UserProvider
      initialUser={{
        id: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        githubUsername: user.githubUsername,
      }}
    >
      <div className="flex h-screen overflow-hidden">
        <Sidebar products={sidebarProducts} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </UserProvider>
  )
}
