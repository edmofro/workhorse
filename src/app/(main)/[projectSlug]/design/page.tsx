import { notFound } from 'next/navigation'
import { prisma } from '../../../../lib/prisma'
import { Topbar, TopbarTitle } from '../../../../components/Topbar'
import { DesignBrowser } from '../../../../components/design/DesignBrowser'

interface Props {
  params: Promise<{ projectSlug: string }>
}

export default async function DesignPage({ params }: Props) {
  const { projectSlug } = await params

  const project = await prisma.project.findFirst({
    where: { name: { equals: decodeURIComponent(projectSlug), mode: 'insensitive' } },
  })
  if (!project) notFound()

  return (
    <>
      <Topbar>
        <TopbarTitle>Design — {project.name}</TopbarTitle>
      </Topbar>
      <DesignBrowser
        owner={project.owner}
        repoName={project.repoName}
        defaultBranch={project.defaultBranch}
      />
    </>
  )
}
