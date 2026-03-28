'use client'

import { useState, useTransition } from 'react'
import { Button } from './Button'
import { createUser } from '../lib/actions/user'

interface UserSetupProps {
  onComplete: (user: { id: string; displayName: string }) => void
}

export function UserSetup({ onComplete }: UserSetupProps) {
  const [name, setName] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      const user = await createUser(name.trim())
      onComplete({ id: user.id, displayName: user.displayName })
    })
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[var(--bg-page)]">
      <div className="w-full max-w-[360px] bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[var(--shadow-md)] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-[26px] h-[26px] bg-[var(--accent)] rounded-[var(--radius-md)] flex items-center justify-center text-white text-[13px] font-bold">
            W
          </div>
          <span className="text-[15px] font-bold tracking-[-0.03em]">Workhorse</span>
        </div>
        <h2 className="text-[16px] font-semibold tracking-[-0.02em] mb-1">
          Welcome
        </h2>
        <p className="text-[13px] text-[var(--text-muted)] mb-6">
          Enter your name to get started.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            className="w-full px-3 py-2 text-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-default)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:shadow-[var(--shadow-input-focus)] placeholder:text-[var(--text-faint)]"
          />
          <Button
            type="submit"
            className="w-full mt-4"
            disabled={!name.trim() || isPending}
          >
            {isPending ? 'Setting up...' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  )
}
