'use client'

import { FileText, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'

interface SpecData {
  id: string
  filePath: string
  isNew: boolean
}

interface SpecListSidebarProps {
  specs: SpecData[]
  activeSpecId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
}

export function SpecListSidebar({
  specs,
  activeSpecId,
  onSelect,
  onAdd,
}: SpecListSidebarProps) {
  return (
    <aside
      className="flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-page)] shrink-0 overflow-y-auto"
      style={{ width: '200px' }}
    >
      <div className="flex items-center justify-between px-3 pt-4 pb-2">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
          Specs
        </span>
        <button
          onClick={onAdd}
          className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors duration-100 cursor-pointer p-1"
        >
          <Plus size={12} />
        </button>
      </div>

      {specs.map((spec) => {
        const fileName = spec.filePath.split('/').pop() ?? spec.filePath
        const isActive = spec.id === activeSpecId

        return (
          <button
            key={spec.id}
            onClick={() => onSelect(spec.id)}
            className={cn(
              'flex items-center gap-2 mx-2 px-2 py-[6px] rounded-[var(--radius-md)] text-left cursor-pointer transition-colors duration-100',
              isActive
                ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            )}
          >
            <FileText size={13} className="shrink-0 text-[var(--text-muted)]" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate">{fileName}</div>
              {spec.isNew && (
                <div className="text-[10px] text-[var(--green)]">new</div>
              )}
            </div>
          </button>
        )
      })}
    </aside>
  )
}
