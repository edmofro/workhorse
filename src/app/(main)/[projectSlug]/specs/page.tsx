import { notFound } from 'next/navigation'
import { prisma } from '../../../../lib/prisma'
import { Topbar, TopbarTitle } from '../../../../components/Topbar'
import { SpecExplorer } from '../../../../components/specs/SpecExplorer'

interface Props {
  params: Promise<{ projectSlug: string }>
}

export default async function ProjectSpecsPage({ params }: Props) {
  const { projectSlug } = await params

  const allProjects = await prisma.project.findMany()
  const project = allProjects.find(
    (p) => p.name.toLowerCase() === decodeURIComponent(projectSlug).toLowerCase(),
  )
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
      />
    </>
  )
}
