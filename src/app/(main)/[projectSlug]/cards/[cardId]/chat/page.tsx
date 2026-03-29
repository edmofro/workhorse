import { notFound } from 'next/navigation'
import { prisma } from '../../../../../../lib/prisma'
import { InterviewView } from '../../../../../../components/card/InterviewView'

interface Props {
  params: Promise<{ cardId: string }>
}

export default async function ChatPage({ params }: Props) {
  const { cardId } = await params

  const card = await prisma.card.findUnique({
    where: { identifier: cardId },
  })

  if (!card) notFound()

  return <InterviewView cardId={card.id} />
}
