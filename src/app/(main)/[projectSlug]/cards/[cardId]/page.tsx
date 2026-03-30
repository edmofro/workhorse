import { CardDetailPage } from '../../../../../components/card/CardDetailPage'

interface Props {
  params: Promise<{ cardId: string }>
  searchParams: Promise<{ session?: string }>
}

export default async function CardPage({ params, searchParams }: Props) {
  const { cardId } = await params
  const { session: sessionParam } = await searchParams

  return <CardDetailPage cardId={cardId} initialSessionId={sessionParam ?? null} />
}
