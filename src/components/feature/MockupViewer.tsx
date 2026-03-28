'use client'

import { useState } from 'react'
import { X, Monitor, Tablet, Smartphone } from 'lucide-react'
import { cn } from '../../lib/cn'

interface MockupViewerProps {
  mockup: {
    id: string
    title: string
    html: string
  }
  onClose: () => void
}

const DEVICES = [
  { key: 'desktop', label: 'Desktop', icon: Monitor, width: '100%' },
  { key: 'tablet', label: 'Tablet', icon: Tablet, width: '768px' },
  { key: 'mobile', label: 'Mobile', icon: Smartphone, width: '375px' },
] as const

type DeviceKey = (typeof DEVICES)[number]['key']

export function MockupViewer({ mockup, onClose }: MockupViewerProps) {
  const [device, setDevice] = useState<DeviceKey>('desktop')

  const currentDevice = DEVICES.find((d) => d.key === device)!

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-page)]">
      {/* Topbar */}
      <div
        className="flex items-center gap-4 px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0"
        style={{ height: '52px' }}
      >
        <span className="text-[15px] font-semibold tracking-[-0.01em]">
          {mockup.title}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Device toggle */}
          <div className="inline-flex bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-[var(--radius-default)] p-[2px] gap-[1px]">
            {DEVICES.map((d) => {
              const Icon = d.icon
              return (
                <button
                  key={d.key}
                  onClick={() => setDevice(d.key)}
                  className={cn(
                    'p-[5px] rounded-[var(--radius-md)] transition-colors duration-100 cursor-pointer',
                    d.key === device
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
                  )}
                >
                  <Icon size={14} />
                </button>
              )
            })}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 flex items-start justify-center overflow-auto p-8 bg-[var(--bg-mockup-stage)]">
        <div
          className="bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] overflow-hidden transition-[width] duration-300"
          style={{
            width: currentDevice.width,
            maxWidth: '100%',
            minHeight: '400px',
          }}
        >
          <iframe
            srcDoc={mockup.html}
            className="w-full border-none"
            style={{ minHeight: '600px' }}
            sandbox="allow-scripts"
            title={mockup.title}
          />
        </div>
      </div>
    </div>
  )
}
