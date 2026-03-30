import { notFound } from 'next/navigation'
import { prisma } from '../../../lib/prisma'
import { Topbar, TopbarTitle, TopbarRight } from '../../../components/Topbar'
import { CardList } from '../../../components/CardList'
import { CreateCardDialog } from '../../../components/CreateCardDialog'
import { CardFilter } from '../../../components/CardFilter'

interface Props {
  params: Promise<{ projectSlug: string }>
  searchParams: Promise<{ team?: string; status?: string; assignee?: string }>
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { projectSlug } = await params
  const { team: teamFilter, status: statusFilter, assignee: assigneeFilter } = await searchParams

  // Fetch project and users in parallel — users don't depend on project
  const [project, users] = await Promise.all([
    prisma.project.findFirst({
      where: { name: { equals: decodeURIComponent(projectSlug), mode: 'insensitive' } },
      include: {
        teams: {
          include: {
            cards: {
              include: { assignee: true, team: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    }),
    prisma.user.findMany({ orderBy: { displayName: 'asc' } }),
  ])
  if (!project) notFound()

  const allCards = project.teams.flatMap((t) => t.cards)

  let cards = allCards
  if (teamFilter) cards = cards.filter((c) => c.team.id === teamFilter)
  if (statusFilter) cards = cards.filter((c) => c.status === statusFilter)
  if (assigneeFilter) cards = cards.filter((c) => c.assignee?.id === assigneeFilter)

  const projectPath = `/${encodeURIComponent(project.name.toLowerCase())}`

  return (
    <>
      <Topbar>
        <TopbarTitle>Board</TopbarTitle>
        <TopbarRight>
          <CardFilter
            teams={project.teams.map((t) => ({ id: t.id, name: t.name, colour: t.colour }))}
            users={users.map((u) => ({ id: u.id, displayName: u.displayName }))}
            basePath={projectPath}
          />
          <CreateCardDialog
            teams={project.teams.map((t) => ({
              id: t.id,
              name: t.name,
              colour: t.colour,
            }))}
            projectName={project.name}
          />
        </TopbarRight>
      </Topbar>
      <CardList cards={cards} projectName={project.name} />
    </>
  )
}
