import { notFound } from 'next/navigation'
import { prisma } from '../../../../../../lib/prisma'
import { ChatView } from '../../../../../../components/card/ChatView'

interface Props {
  params: Promise<{ cardId: string }>
}

export default async function ChatPage({ params }: Props) {
  const { cardId } = await params

  const card = await prisma.card.findUnique({
    where: { identifier: cardId },
    include: {
      specMessages: {
        orderBy: { createdAt: 'asc' },
        include: { user: true },
      },
    },
  })

  if (!card) notFound()

  const messages = card.specMessages
    .filter((m) => m.role === 'user' || m.role === 'assistant' || m.role === 'system')
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      userName: m.user?.displayName,
      createdAt: m.createdAt.toISOString(),
    }))

  return <ChatView cardId={card.id} initialMessages={messages} />
}
