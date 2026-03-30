import { cn } from '../../lib/cn'

interface SegmentedToggleProps<K extends string> {
  options: readonly { key: K; label: string }[]
  value: K
  onChange: (key: K) => void
  className?: string
}

/** Segmented control toggle used for device selection and file/changes views. */
export function SegmentedToggle<K extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedToggleProps<K>) {
  return (
    <div
      className={cn(
        'inline-flex bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-[var(--radius-default)] p-[2px] gap-[1px]',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.key}
          onClick={() => onChange(option.key)}
          className={cn(
            'px-[14px] py-[5px] rounded-[var(--radius-md)] text-[12px] font-medium leading-none transition-colors duration-100 cursor-pointer',
            option.key === value
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
