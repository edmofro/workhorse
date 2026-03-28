'use client'

import { useState, useCallback } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { Button } from '../Button'
import { MarkdownContent } from './MarkdownContent'

interface ReviewPanelProps {
  featureId: string
  hasSpecs: boolean
}

export function ReviewPanel({ featureId, hasSpecs }: ReviewPanelProps) {
  const [reviewContent, setReviewContent] = useState<string | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)

  const handleReview = useCallback(async () => {
    setIsReviewing(true)
    setReviewContent('')

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId }),
      })

      if (!res.ok || !res.body) throw new Error('Review failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setReviewContent(accumulated)
      }
    } catch {
      setReviewContent('Review failed. Please try again.')
    } finally {
      setIsReviewing(false)
    }
  }, [featureId])

  return (
    <div className="border-t border-[var(--border-subtle)] mt-6 pt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
          Fresh-eyes review
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReview}
          disabled={isReviewing || !hasSpecs}
        >
          <ClipboardCheck size={12} />
          {isReviewing ? 'Reviewing...' : 'Run review'}
        </Button>
      </div>

      {!hasSpecs && (
        <p className="text-[12px] text-[var(--text-muted)]">
          Create a spec first to run a review.
        </p>
      )}

      {reviewContent !== null && (
        <div className="mt-3 p-4 bg-[var(--bg-page)] border border-[var(--border-subtle)] rounded-[var(--radius-default)]">
          <div className="text-[14px] text-[var(--text-secondary)] leading-[1.7]">
            <MarkdownContent content={reviewContent} />
          </div>
        </div>
      )}
    </div>
  )
}
