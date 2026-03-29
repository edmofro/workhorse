import { redirect } from 'next/navigation'
import { getCurrentUser } from '../../../lib/auth/session'
import { getProjects } from '../../../lib/actions/projects'
import { Topbar, TopbarTitle } from '../../../components/Topbar'
import { SettingsForm } from '../../../components/SettingsForm'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const projects = await getProjects()

  return (
    <>
      <Topbar>
        <TopbarTitle>Settings</TopbarTitle>
      </Topbar>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-[600px]">
          <SettingsForm
            projects={projects.map((p) => ({
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
          />
        </div>
      </div>
    </>
  )
}
