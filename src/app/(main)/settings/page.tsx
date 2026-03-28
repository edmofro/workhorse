import { getProducts } from '../../../lib/actions/products'
import { getCurrentUser } from '../../../lib/actions/user'
import { Topbar, TopbarTitle } from '../../../components/Topbar'
import { SettingsForm } from '../../../components/SettingsForm'

export default async function SettingsPage() {
  const [products, user] = await Promise.all([
    getProducts(),
    getCurrentUser(),
  ])

  return (
    <>
      <Topbar>
        <TopbarTitle>Settings</TopbarTitle>
      </Topbar>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[600px]">
          <SettingsForm
            products={products.map((p) => ({
              id: p.id,
              name: p.name,
              githubUrl: p.githubUrl,
              owner: p.owner,
              repoName: p.repoName,
              defaultBranch: p.defaultBranch,
              teams: p.teams.map((t) => ({
                id: t.id,
                name: t.name,
                colour: t.colour,
              })),
            }))}
            user={user ? { id: user.id, displayName: user.displayName } : null}
          />
        </div>
      </div>
    </>
  )
}
