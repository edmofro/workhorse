'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Topbar, TopbarFeatureTitle, TopbarRight } from '../Topbar'
import { Button } from '../Button'
import { cn } from '../../lib/cn'

interface FeatureDetailShellProps {
  feature: {
    id: string
    identifier: string
    title: string
    status: string
  }
  productSlug: string
  children: React.ReactNode
}

export function FeatureDetailShell({
  feature,
  productSlug,
  children,
}: FeatureDetailShellProps) {
  const pathname = usePathname()
  const basePath = `/${productSlug}/features/${feature.identifier}`

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
        <TopbarFeatureTitle
          title={feature.title}
          identifier={feature.identifier}
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
          {feature.status === 'SPEC_COMPLETE' && (
            <Button>Commit spec</Button>
          )}
        </TopbarRight>
      </Topbar>
      {children}
    </>
  )
}
