import { DesignPage } from '../../../../components/design/DesignPage'

interface Props {
  params: Promise<{ projectSlug: string }>
}

export default async function ProjectDesignPage({ params }: Props) {
  const { projectSlug } = await params
  return <DesignPage projectSlug={projectSlug} />
}
