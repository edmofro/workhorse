import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getProjects } from '../../lib/actions/projects'

export default async function HomePage() {
  const projects = await getProjects()

  if (projects.length > 0) {
    const cookieStore = await cookies()
    const lastSlug = cookieStore.get('workhorse_last_project')?.value
    const lastProject = lastSlug
      ? projects.find((p) => p.name.toLowerCase() === lastSlug)
      : null
    const target = lastProject ?? projects[0]
    redirect(`/${encodeURIComponent(target.name.toLowerCase())}`)
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
