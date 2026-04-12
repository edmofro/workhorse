'use client'

import { createPortal } from 'react-dom'
import { StatusChip } from './StatusChip'
import { PropertiesPopover } from './PropertiesPopover'

interface TopbarCardActionsProps {
  card: {
    id: string
    status: string
    priority: string
    team: { id: string; name: string }
    assignee: { id: string; displayName: string } | null
    dependsOn: { identifier: string; title: string }[]
  }
  users: { id: string; displayName: string }[]
  teams: { id: string; name: string }[]
  portalTarget: HTMLDivElement | null
}

export function TopbarCardActions({
  card,
  users,
  teams,
  portalTarget,
}: TopbarCardActionsProps) {
  if (!portalTarget) return null

  return createPortal(
    <>
      <StatusChip cardId={card.id} initialStatus={card.status} />
      <PropertiesPopover card={card} users={users} teams={teams} />
    </>,
    portalTarget,
  )
}
