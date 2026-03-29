import { redirect } from 'next/navigation'
import { getCurrentUser } from '../../lib/auth/session'
import { getProjects } from '../../lib/actions/projects'
import { filterAccessibleRepos } from '../../lib/auth/github'
import { UserProvider } from '../../components/UserProvider'
import { Sidebar } from '../../components/Sidebar'
import { prisma } from '../../lib/prisma'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const allProjects = await getProjects()

  const accessibleRepoKeys = await filterAccessibleRepos(
    user.accessToken,
    allProjects.map((p) => ({ owner: p.owner, repoName: p.repoName })),
  )

  const projects = allProjects.filter((p) =>
    accessibleRepoKeys.has(`${p.owner}/${p.repoName}`),
  )

  const sidebarProjects = projects.map((p) => ({
    id: p.id,
    name: p.name,
    teams: p.teams.map((t) => ({ id: t.id, name: t.name, colour: t.colour })),
  }))

  // Fetch recent conversation sessions for the sidebar
  const recentSessions = await prisma.conversationSession.findMany({
    where: { userId: user.id },
    orderBy: { lastMessageAt: 'desc' },
    take: 8,
    include: {
      card: {
        select: {
          identifier: true,
          title: true,
          team: {
            select: {
              colour: true,
              project: { select: { name: true } },
            },
          },
        },
      },
      team: {
        select: {
          colour: true,
          project: { select: { name: true } },
        },
      },
    },
  })

  const recentSessionData = recentSessions.map((s) => ({
    id: s.id,
    title: s.title,
    cardId: s.cardId,
    cardIdentifier: s.card?.identifier ?? null,
    teamColour: s.card?.team?.colour ?? s.team?.colour ?? null,
    projectName: s.card?.team?.project?.name ?? s.team?.project?.name ?? null,
    lastMessageAt: s.lastMessageAt.toISOString(),
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
        <Sidebar projects={sidebarProjects} recentSessions={recentSessionData} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </UserProvider>
  )
}
