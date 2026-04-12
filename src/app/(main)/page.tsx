import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getProjects } from '../../lib/actions/projects'
import { getCurrentUser } from '../../lib/auth/session'
import { filterAccessibleRepos } from '../../lib/auth/github'

export default async function HomePage() {
  const user = await getCurrentUser()
  const allProjects = await getProjects()

  // Filter to accessible projects
  const accessibleRepoKeys = user
    ? await filterAccessibleRepos(
        user.accessToken,
        allProjects.map((p) => ({ owner: p.owner, repoName: p.repoName })),
      )
    : new Set<string>()

  const projects = allProjects.filter((p) =>
    accessibleRepoKeys.has(`${p.owner}/${p.repoName}`),
  )

  if (projects.length > 0) {
    // Check for a last-used project preference
    const cookieStore = await cookies()
    const lastSlug = cookieStore.get('lastProject')?.value
    if (lastSlug) {
      const decoded = decodeURIComponent(lastSlug)
      const lastProject = projects.find(
        (p) => p.name.toLowerCase() === decoded,
      )
      if (lastProject) {
        redirect(`/${encodeURIComponent(lastProject.name.toLowerCase())}`)
      }
    }

    // Fall back to first accessible project
    redirect(`/${encodeURIComponent(projects[0].name.toLowerCase())}`)
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-[320px]">
        <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-2">
          No projects yet
        </h2>
        <p className="text-[13px] text-[var(--text-muted)] mb-4">
          Add a project in settings to get started.
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
