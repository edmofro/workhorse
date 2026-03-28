import { notFound } from 'next/navigation'
import { prisma } from '../../../../../../lib/prisma'
import { ChatView } from '../../../../../../components/feature/ChatView'

interface Props {
  params: Promise<{ featureId: string }>
}

export default async function ChatPage({ params }: Props) {
  const { featureId } = await params

  const feature = await prisma.feature.findUnique({
    where: { identifier: featureId },
    include: {
      specMessages: {
        orderBy: { createdAt: 'asc' },
        include: { user: true },
      },
    },
  })

  if (!feature) notFound()

  const messages = feature.specMessages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      userName: m.user?.displayName,
      createdAt: m.createdAt.toISOString(),
    }))

  return <ChatView featureId={feature.id} initialMessages={messages} />
}
