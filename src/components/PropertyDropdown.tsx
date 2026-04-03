'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/cn'

export interface PropertyOption {
  value: string
  label: string
  icon?: React.ReactNode
}

/**
 * Shared hook for portal-anchored dropdown menus. Handles open state,
 * position calculation, click-outside dismissal, and scroll-to-close.
 * Used by PropertyDropdown and any custom pill that needs its own menu body.
 */
export function usePortalMenu() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    function handleScroll() {
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  return { open, setOpen, toggle, triggerRef, menuRef, pos }
}

interface PropertyDropdownProps {
  /** Content rendered inside the pill trigger button */
  trigger: React.ReactNode
  options: PropertyOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * A pill trigger that opens a portal dropdown using the same visual shell as
 * the board card overflow menu. Use this for all property selectors in the
 * card view so they match the board's interaction pattern.
 */
export function PropertyDropdown({
  trigger,
  options,
  value,
  onChange,
  className,
}: PropertyDropdownProps) {
  const { open, setOpen, toggle, triggerRef, menuRef, pos } = usePortalMenu()

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggle}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-md)]',
          'text-[12px] font-medium text-[var(--text-secondary)]',
          'hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer',
          className,
        )}
      >
        {trigger}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left }}
            className="z-50 min-w-[152px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] py-1"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--bg-hover)] transition-colors duration-100 cursor-pointer flex items-center gap-2',
                  value === opt.value
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
