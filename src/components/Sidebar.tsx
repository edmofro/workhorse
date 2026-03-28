'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Settings, FileText, Palette } from 'lucide-react'
import { cn } from '../lib/cn'
import { Avatar } from './Avatar'
import { useUser } from './UserProvider'

interface SidebarProduct {
  id: string
  name: string
  teams: { id: string; name: string; colour: string }[]
}

interface SidebarProps {
  products: SidebarProduct[]
}

export function Sidebar({ products }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useUser()

  return (
    <aside
      className="flex flex-col shrink-0 bg-[var(--bg-sidebar)] border-r border-[var(--border-subtle)]"
      style={{ width: '216px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-[10px] px-4 pt-5 pb-6">
        <div className="w-[26px] h-[26px] bg-[var(--accent)] rounded-[var(--radius-md)] flex items-center justify-center text-white text-[13px] font-bold">
          W
        </div>
        <span className="text-[15px] font-bold tracking-[-0.03em]">Workhorse</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 overflow-y-auto">
        <NavItem
          href="/"
          icon={<LayoutGrid size={15} />}
          active={pathname === '/'}
        >
          Features
        </NavItem>

        {products.length > 0 && (
          <>
            <div className="px-2 pt-5 pb-[6px] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
              Products
            </div>
            {products.map((product) => {
              const productPath = `/${encodeURIComponent(product.name.toLowerCase())}`
              return (
                <div key={product.id}>
                  <NavItem
                    href={productPath}
                    active={pathname === productPath || pathname.startsWith(`${productPath}/features`)}
                  >
                    {product.name}
                  </NavItem>
                  <NavItem
                    href={`${productPath}/specs`}
                    icon={<FileText size={13} />}
                    active={pathname === `${productPath}/specs`}
                  >
                    Specs
                  </NavItem>
                  <NavItem
                    href={`${productPath}/design`}
                    icon={<Palette size={13} />}
                    active={pathname === `${productPath}/design`}
                  >
                    Design
                  </NavItem>
                </div>
              )
            })}
          </>
        )}

        {products.map((product) =>
          product.teams.length > 0 ? (
            <div key={product.id}>
              <div className="px-2 pt-5 pb-[6px] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
                Teams
              </div>
              {product.teams.map((team) => (
                <NavItem
                  key={team.id}
                  href={`/${encodeURIComponent(product.name.toLowerCase())}?team=${team.id}`}
                  active={false}
                  dot={team.colour}
                >
                  {team.name}
                </NavItem>
              ))}
            </div>
          ) : null,
        )}
      </nav>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-[14px] border-t border-[var(--border-subtle)]">
        <Avatar variant="human" initial={user.displayName} size="sm" />
        <span className="text-xs text-[var(--text-secondary)] truncate flex-1">
          {user.displayName}
        </span>
        <Link
          href="/settings"
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-100"
        >
          <Settings size={14} />
        </Link>
      </div>
    </aside>
  )
}

function NavItem({
  href,
  icon,
  dot,
  active,
  children,
}: {
  href: string
  icon?: React.ReactNode
  dot?: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-2 py-[7px] rounded-[var(--radius-md)]',
        'text-[13px] cursor-pointer transition-colors duration-100',
        active
          ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium shadow-[var(--shadow-sm)]'
          : 'text-[var(--text-secondary)] font-[450] hover:bg-[var(--bg-hover)]',
      )}
    >
      {icon}
      {dot && (
        <span
          className="w-[7px] h-[7px] rounded-full shrink-0"
          style={{ background: dot }}
        />
      )}
      {children}
    </Link>
  )
}
