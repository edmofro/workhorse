import { redirect } from 'next/navigation'
import { getCurrentUser } from '../../lib/auth/session'
import { SignInButton } from './SignInButton'

interface Props {
  searchParams: Promise<{ error?: string; returnTo?: string }>
}

export default async function SignInPage({ searchParams }: Props) {
  const user = await getCurrentUser()
  if (user) {
    redirect('/')
  }

  const { error, returnTo } = await searchParams

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
          Sign in
        </h2>
        <p className="text-[13px] text-[var(--text-muted)] mb-6">
          Sign in with your GitHub account to get started.
        </p>

        {error && (
          <div className="mb-4 p-3 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-[var(--radius-default)]">
            {error === 'invalid_state'
              ? 'Sign-in session expired. Please try again.'
              : 'Authentication failed. Please try again.'}
          </div>
        )}

        <SignInButton returnTo={returnTo} />
      </div>
    </div>
  )
}
