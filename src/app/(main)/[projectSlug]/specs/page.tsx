import { notFound } from 'next/navigation'
import { prisma } from '../../../../lib/prisma'
import { Topbar, TopbarTitle } from '../../../../components/Topbar'
import { SpecExplorer } from '../../../../components/specs/SpecExplorer'

interface Props {
  params: Promise<{ projectSlug: string }>
}

export default async function ProjectSpecsPage({ params }: Props) {
  const { projectSlug } = await params

  const projects = await prisma.project.findMany({
    where: { name: { equals: decodeURIComponent(projectSlug), mode: 'insensitive' } },
    include: { teams: true },
    take: 1,
  })
  const project = projects[0]
  if (!project) notFound()

  return (
    <>
      <Topbar>
        <TopbarTitle>Specs — {project.name}</TopbarTitle>
      </Topbar>
      <SpecExplorer
        owner={project.owner}
        repoName={project.repoName}
        defaultBranch={project.defaultBranch}
        projectName={project.name}
        teams={project.teams.map((t) => ({ id: t.id, name: t.name }))}
      />
    </>
  )
}
