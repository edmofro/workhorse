'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

interface MockupViewerProps {
  mockup: {
    id: string
    title: string
    html: string
  }
  onClose: () => void
  featureId?: string
}

const DEVICES = [
  { key: 'desktop', label: 'Desktop', width: '100%' },
  { key: 'tablet', label: 'Tablet', width: '768px' },
  { key: 'mobile', label: 'Mobile', width: '375px' },
] as const

type DeviceKey = (typeof DEVICES)[number]['key']

export function MockupViewer({ mockup, onClose }: MockupViewerProps) {
  const [device, setDevice] = useState<DeviceKey>('desktop')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<
    { id: string; role: 'user' | 'assistant'; content: string; userName: string; createdAt: string }[]
  >([])
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const currentDevice = DEVICES.find((d) => d.key === device)!

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  function handleChatSend(content: string) {
    setChatMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        userName: 'You',
        createdAt: new Date().toISOString(),
      },
    ])
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-page)]">
      {/* Toolbar — matches option-b9 mockup */}
      <div
        className="flex items-center px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] shrink-0"
        style={{ height: '52px' }}
      >
        <span className="text-[15px] font-semibold tracking-[-0.01em]">
          {mockup.title}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {/* Device toggle — text labels per mockup */}
          <div className="inline-flex bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-[var(--radius-default)] p-[2px] gap-[1px]">
            {DEVICES.map((d) => (
              <button
                key={d.key}
                onClick={() => setDevice(d.key)}
                className={cn(
                  'px-[14px] py-[5px] rounded-[var(--radius-md)] text-xs font-medium leading-none transition-colors duration-100 cursor-pointer',
                  d.key === device
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
                )}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Stage — grey surround with centred mockup */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 flex items-start justify-center overflow-auto p-8 bg-[var(--bg-mockup-stage)]">
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

        {/* Floating chat pill — bottom centre, per option-b9 */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="absolute left-1/2 -translate-x-1/2 bottom-5 px-5 py-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full shadow-[var(--shadow-md)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
          >
            Chat about this mockup
          </button>
        )}

        {/* Floating chat panel — per option-b9 */}
        {chatOpen && (
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[16px] shadow-[var(--shadow-lg)] flex flex-col overflow-hidden"
            style={{ width: '640px', maxWidth: 'calc(100% - 40px)', maxHeight: '60vh' }}
          >
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
              <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                Chat
              </span>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-100 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3">
              {chatMessages.length === 0 && (
                <p className="text-[13px] text-[var(--text-faint)] text-center py-4">
                  Discuss changes to this mockup
                </p>
              )}
              {chatMessages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  userName={msg.userName}
                  timestamp={msg.createdAt}
                />
              ))}
            </div>

            {/* Input */}
            <ChatInput
              onSend={handleChatSend}
              placeholder="Suggest changes..."
              compact
            />
          </div>
        )}
      </div>
    </div>
  )
}
