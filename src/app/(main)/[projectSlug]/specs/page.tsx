import { SpecsPage } from '../../../../components/specs/SpecsPage'

interface Props {
  params: Promise<{ projectSlug: string }>
}

export default async function ProjectSpecsPage({ params }: Props) {
  const { projectSlug } = await params
  return <SpecsPage projectSlug={projectSlug} />
}
