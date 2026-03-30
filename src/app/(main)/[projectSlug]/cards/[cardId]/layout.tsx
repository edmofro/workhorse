import { CardDetailLayout } from '../../../../../components/card/CardDetailLayout'

interface Props {
  params: Promise<{ projectSlug: string; cardId: string }>
  children: React.ReactNode
}

export default async function CardLayout({ params, children }: Props) {
  const { projectSlug, cardId } = await params

  return (
    <CardDetailLayout projectSlug={projectSlug} cardId={cardId}>
      {children}
    </CardDetailLayout>
  )
}
