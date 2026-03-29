import { redirect, notFound } from 'next/navigation'
import { prisma } from '../../../../../lib/prisma'

interface Props {
  params: Promise<{ projectSlug: string; sessionId: string }>
}

/**
 * Standalone session page.
 *
 * If the session has acquired a card (via auto-creation), redirect to the card page
 * with ?session= param. Otherwise, show a standalone chat view (placeholder for now).
 */
export default async function SessionPage({ params }: Props) {
  const { projectSlug, sessionId } = await params

  const session = await prisma.conversationSession.findUnique({
    where: { id: sessionId },
    include: {
      card: { select: { identifier: true } },
    },
  })

  if (!session) notFound()

  // If session has a card, redirect to the card page with session param
  if (session.card) {
    redirect(`/${projectSlug}/cards/${session.card.identifier}?session=${sessionId}`)
  }

  // Standalone session without a card — placeholder for now
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <p className="text-[14px] text-[var(--text-muted)] mb-1">
          {session.title ?? 'New conversation'}
        </p>
        <p className="text-[13px] text-[var(--text-faint)]">
          Standalone sessions are coming soon.
        </p>
      </div>
    </div>
  )
}
