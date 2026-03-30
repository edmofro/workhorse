import { ProjectBoard } from '../../../components/ProjectBoard'

interface Props {
  params: Promise<{ projectSlug: string }>
  searchParams: Promise<{ team?: string; status?: string; assignee?: string }>
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const { projectSlug } = await params
  const filters = await searchParams

  return <ProjectBoard projectSlug={projectSlug} filters={filters} />
}
