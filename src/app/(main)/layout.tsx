import { getCurrentUser } from '../../lib/actions/user'
import { getProducts } from '../../lib/actions/products'
import { UserProvider } from '../../components/UserProvider'
import { Sidebar } from '../../components/Sidebar'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, products] = await Promise.all([
    getCurrentUser(),
    getProducts(),
  ])

  const sidebarProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    teams: p.teams.map((t) => ({ id: t.id, name: t.name, colour: t.colour })),
  }))

  return (
    <UserProvider
      initialUser={user ? { id: user.id, displayName: user.displayName } : null}
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
