import { cn } from '../lib/cn'

interface ViewToggleTab {
  label: string
  value: string
}

interface ViewToggleProps {
  tabs: ViewToggleTab[]
  activeTab: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Segmented control for toggling between views.
 * Follows the design guide's view toggle (segmented control) spec exactly.
 */
export function ViewToggle({
  tabs,
  activeTab,
  onChange,
  className,
}: ViewToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex',
        'bg-[var(--bg-page)]',
        'border border-[var(--border-subtle)]',
        'rounded-[var(--radius-default)]',
        'p-[2px] gap-[1px]',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'px-[14px] py-[5px]',
              'rounded-[var(--radius-md)]',
              'text-xs font-medium leading-none',
              'cursor-pointer transition-colors duration-100',
              isActive
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
