'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Topbar, TopbarCardTitle, TopbarRight } from '../Topbar'
import { CollaborateButton } from './CollaborateButton'
import { MarkReadyButton } from './MarkReadyButton'
import { cn } from '../../lib/cn'

interface CardDetailShellProps {
  card: {
    id: string
    identifier: string
    title: string
    status: string
    cardBranch: string | null
    touchedFiles: string[]
    defaultBranch: string
  }
  projectSlug: string
  children: React.ReactNode
}

export function CardDetailShell({
  card,
  projectSlug,
  children,
}: CardDetailShellProps) {
  const pathname = usePathname()
  const basePath = `/${projectSlug}/cards/${card.identifier}`

  const activeTab = pathname.includes('/chat')
    ? 'chat'
    : pathname.includes('/spec')
      ? 'spec'
      : 'card'

  const tabs = [
    { label: 'Card', value: 'card', href: basePath },
    { label: 'Chat', value: 'chat', href: `${basePath}/chat` },
    { label: 'Spec', value: 'spec', href: `${basePath}/spec` },
  ]

  return (
    <>
      <Topbar>
        <TopbarCardTitle
          title={card.title}
          identifier={card.identifier}
        />
        <TopbarRight>
          <div className="inline-flex bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-[var(--radius-default)] p-[2px] gap-[1px]">
            {tabs.map((tab) => {
              const isActive = tab.value === activeTab
              return (
                <Link
                  key={tab.value}
                  href={tab.href}
                  className={cn(
                    'px-[14px] py-[5px] rounded-[var(--radius-md)] text-xs font-medium leading-none transition-colors duration-100',
                    isActive
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
          <MarkReadyButton
            cardId={card.id}
            status={card.status}
          />
          <CollaborateButton
            cardId={card.id}
            cardIdentifier={card.identifier}
            cardBranch={card.cardBranch}
            status={card.status}
            touchedFiles={card.touchedFiles}
            defaultBranch={card.defaultBranch}
          />
        </TopbarRight>
      </Topbar>
      {children}
    </>
  )
}
