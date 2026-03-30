'use client'

import { useRef } from 'react'
import { cn } from '../../lib/cn'
import type { DeviceKey } from './SpecHeaderBar'

const DEVICE_WIDTHS: Record<DeviceKey, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

interface MockupArtifactProps {
  html: string
  title: string
  device: DeviceKey
}

/** Renders a mockup HTML file as an artifact (inline, not full-screen overlay).
 *  Shows the rendered HTML in an iframe with device-responsive sizing. */
export function MockupArtifact({ html, title, device }: MockupArtifactProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  return (
    <div className="flex-1 overflow-auto bg-[var(--bg-mockup-stage)]">
      <div className="flex items-start justify-center p-6 min-h-full">
        <div
          className={cn(
            'bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] overflow-hidden transition-[width] duration-300 ease-out',
          )}
          style={{
            width: DEVICE_WIDTHS[device],
            maxWidth: '100%',
            minHeight: '400px',
          }}
        >
          {/* sandbox: allow-scripts enables JS; allow-same-origin is intentionally
             omitted so mockup HTML cannot access parent page storage/cookies.
             Trade-off: external font links and relative asset URLs won't load. */}
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="w-full border-none"
            style={{ minHeight: '600px' }}
            sandbox="allow-scripts"
            title={title}
          />
        </div>
      </div>
    </div>
  )
}
