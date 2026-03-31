'use client'

import { useState, useRef, useEffect } from 'react'
import { Activity } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { CardActivity } from '../../lib/hooks/queries'
import { Avatar } from '../Avatar'

interface ActivityPopoverProps {
  activities: CardActivity[]
}

export function ActivityPopover({ activities }: ActivityPopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'p-2 rounded-[var(--radius-default)] transition-colors duration-100 cursor-pointer',
          open
            ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
        )}
        title="Activity"
      >
        <Activity size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] z-50 overflow-hidden">
          <div className="px-4 pt-3 pb-2">
            <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
              Activity
            </h3>
          </div>

          {activities.length === 0 ? (
            <div className="px-4 pb-4 text-[13px] text-[var(--text-faint)]">
              No activity yet
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto px-4 pb-3 space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-2">
                  {activity.user ? (
                    <Avatar
                      variant="human"
                      initial={activity.user.displayName}
                      size="sm"
                    />
                  ) : (
                    <Avatar variant="ai" size="sm" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-[var(--text-secondary)]">
                      {activity.user?.displayName ?? 'System'}{' '}
                      <span className="text-[var(--text-muted)]">
                        {activity.action.replace(/_/g, ' ')}
                      </span>
                    </span>
                    <div className="text-[11px] text-[var(--text-faint)]">
                      {new Date(activity.createdAt).toLocaleString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
