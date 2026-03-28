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

  const allProjects = await prisma.project.findMany()
  const matchedProject = allProjects.find(
    (p) => p.name.toLowerCase() === projectSlug.toLowerCase(),
  )
  if (!matchedProject) notFound()

  const project = await prisma.project.findUnique({
    where: { id: matchedProject.id },
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
  })
  if (!project) notFound()

  const allCards = project.teams.flatMap((t) => t.cards)
  const users = await prisma.user.findMany({ orderBy: { displayName: 'asc' } })

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
