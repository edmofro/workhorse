'use client'

import { notFound } from 'next/navigation'
import { useCardDetail, useCardFiles, NotFoundError } from '../../lib/hooks/queries'
import { CardTab } from './CardTab'
import { CardWorkspace } from './CardWorkspace'
import { Skeleton } from '../Skeleton'

function CardSkeleton() {
  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-[680px] mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-7 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex gap-1 border-b border-[var(--border-subtle)] pb-px">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-[22px] w-[22px] rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface Props {
  cardId: string
  initialSessionId: string | null
}

export function CardDetailPage({ cardId, initialSessionId }: Props) {
  const { data, isLoading, error } = useCardDetail(cardId)

  // Files load independently — card UI renders before git operations complete
  const { data: filesData, isLoading: filesLoading } = useCardFiles(cardId)

  if (isLoading) return <CardSkeleton />
  if (error instanceof NotFoundError) notFound()
  if (error || !data) return <CardSkeleton />

  const { card, users, teams, sessions } = data

  const cardTabContent = (
    <CardTab
      card={{
        id: card.id,
        identifier: card.identifier,
        title: card.title,
        description: card.description,
        tags: card.tags,
        attachments: card.attachments,
        comments: card.comments,
      }}
    />
  )

  return (
    <CardWorkspace
      card={{
        id: card.id,
        identifier: card.identifier,
        title: card.title,
        status: card.status,
        priority: card.priority,
        team: card.team,
        assignee: card.assignee,
        dependsOn: card.dependsOn,
        cardBranch: card.cardBranch,
        prUrl: card.prUrl,
        prNumber: card.prNumber ?? null,
      }}
      users={users}
      teams={teams}
      cardTabContent={cardTabContent}
      initialFiles={filesData?.initialFiles ?? []}
      initialCodeFiles={filesData?.initialCodeFiles ?? []}
      filesLoading={filesLoading}
      projectSpecs={filesData?.projectSpecs ?? []}
      sessions={sessions}
      initialSessionId={initialSessionId}
    />
  )
}
