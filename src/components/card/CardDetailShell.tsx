'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Topbar, TopbarCardTitle } from '../Topbar'
import { useCardShell, useCardShellPortalCallbackRef } from './CardShellContext'

interface CardDetailShellProps {
  card: {
    id: string
    identifier: string
    title: string
    status: string
    cardBranch: string | null
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
  const { breadcrumb, titleClickable, goToCardHome } = useCardShell()
  const portalCallbackRef = useCardShellPortalCallbackRef()

  return (
    <>
      <Topbar>
        {/* ← always goes to board */}
        <Link
          href={`/${projectSlug}`}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100"
        >
          <ArrowLeft size={16} />
        </Link>

        {/* Card title — clickable when not on card home */}
        {titleClickable && goToCardHome ? (
          <button
            onClick={goToCardHome}
            className="flex items-baseline min-w-0 cursor-pointer group"
          >
            <span className="text-[15px] font-semibold tracking-[-0.01em] leading-[1.3] group-hover:text-[var(--accent)] transition-colors duration-100 truncate">
              {card.title}
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono font-medium ml-[6px] shrink-0">
              {card.identifier}
            </span>
          </button>
        ) : (
          <TopbarCardTitle title={card.title} identifier={card.identifier} />
        )}

        {/* Breadcrumb label */}
        {breadcrumb && (
          <>
            <span className="text-[13px] text-[var(--text-faint)] shrink-0">›</span>
            <span className="text-[13px] font-[450] text-[var(--text-secondary)] shrink-0 truncate max-w-[200px]">
              {breadcrumb}
            </span>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Portal target for status chip + properties button rendered by CardWorkspace */}
        <div ref={portalCallbackRef} className="flex items-center gap-1 shrink-0" />
      </Topbar>
      {children}
    </>
  )
}
