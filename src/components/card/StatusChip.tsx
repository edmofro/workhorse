'use client'

import { useState, useEffect, useMemo, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { StatusIcon } from '../StatusIcon'
import { usePortalMenu, type PropertyOption } from '../PropertyDropdown'
import { updateCard } from '../../lib/actions/cards'
import { STATUS_OPTIONS, dbStatusToIconState } from '../../lib/status'

export function StatusChip({
  cardId,
  initialStatus,
}: {
  cardId: string
  initialStatus: string
}) {
  const [status, setStatus] = useState(initialStatus)
  const [, startTransition] = useTransition()
  const { open, setOpen, toggle, triggerRef, menuRef, pos } = usePortalMenu({
    align: 'right',
  })

  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  const statusOptions = useMemo<PropertyOption[]>(
    () =>
      STATUS_OPTIONS.map((opt) => ({
        value: opt.value,
        label: opt.label,
        icon: <StatusIcon state={dbStatusToIconState(opt.value)} />,
      })),
    [],
  )

  const currentLabel =
    STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status

  function handleChange(val: string) {
    const prev = status
    setStatus(val)
    setOpen(false)
    startTransition(async () => {
      try {
        await updateCard(cardId, { status: val })
      } catch {
        setStatus(prev)
      }
    })
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-md)]',
          'text-[12px] font-medium text-[var(--text-secondary)]',
          'hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer',
          open && 'bg-[var(--bg-hover)]',
        )}
      >
        <StatusIcon state={dbStatusToIconState(status)} />
        {currentLabel}
        <ChevronDown
          size={11}
          className={cn(
            'text-[var(--text-faint)] transition-transform duration-100',
            open && 'rotate-180',
          )}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, right: pos.right }}
            className="z-50 min-w-[180px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] py-1"
          >
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleChange(opt.value)}
                className={cn(
                  'w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer flex items-center gap-2',
                  status === opt.value
                    ? 'text-[var(--text-primary)] font-medium'
                    : 'text-[var(--text-secondary)]',
                )}
              >
                {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                {opt.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
