import { redirect } from 'next/navigation'
import { getCurrentUser } from '../../../lib/auth/session'
import { getProducts } from '../../../lib/actions/products'
import { getUserTeamIds } from '../../../lib/actions/teams'
import { Topbar, TopbarTitle } from '../../../components/Topbar'
import { SettingsForm } from '../../../components/SettingsForm'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const [products, memberTeamIds] = await Promise.all([
    getProducts(),
    getUserTeamIds(user.id),
  ])

  const memberSet = new Set(memberTeamIds)

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
                isMember: memberSet.has(t.id),
              })),
            }))}
          />
        </div>
      </div>
    </>
  )
}
