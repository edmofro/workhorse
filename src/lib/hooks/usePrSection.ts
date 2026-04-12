'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useBranchStatus, type BranchStatusData } from './queries'

export interface PrSectionInput {
  cardId: string
  cardIdentifier: string
  hasCodeChanges: boolean
  prUrl: string | null
  prNumber: number | null
  cardBranch: string | null
  dependsOn: { identifier: string; title: string }[]
  defaultBranch: string
  repoOwner: string
  repoName: string
  onPrCreated: (prUrl: string, prNumber?: number) => void
}

export type PrState = 'hidden' | 'create' | 'open' | 'merged' | 'merged-new' | 'updating'

export interface PrSectionState {
  state: PrState
  error: string | null
  expanded: boolean
  copied: boolean
  isCreating: boolean
  isOperating: boolean

  // Derived display data
  safePrUrl: string | null
  displayNumber: string | null
  displayTitle: string
  isMerged: boolean
  ci: BranchStatusData['ci'] | null
  liveBranchName: string | null
  basedOn: string
  isCardDependency: boolean
  upstreamBehind: number
  postMergeCommits: number
  checksUrl: string | null

  // Branch details
  localChanges: number
  unpushedCommits: number
  remoteAhead: number

  // Handlers
  toggleExpanded: () => void
  handleCreatePr: () => Promise<void>
  handleCopyBranch: (name: string) => Promise<void>
  handleCommit: () => Promise<void>
  handlePush: () => Promise<void>
  handlePull: () => Promise<void>
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function usePrSection(input: PrSectionInput): PrSectionState {
  const {
    cardId,
    cardIdentifier,
    hasCodeChanges,
    prUrl,
    prNumber,
    cardBranch,
    dependsOn,
    defaultBranch,
    repoOwner,
    repoName,
    onPrCreated,
  } = input

  const queryClient = useQueryClient()
  const [isCreating, setIsCreating] = useState(false)
  const [isOperating, setIsOperating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const shouldPoll = !!(prUrl || cardBranch || hasCodeChanges)
  const { data: status } = useBranchStatus(cardIdentifier, shouldPoll)

  const safePrUrl = prUrl && isSafeUrl(prUrl) ? prUrl : null

  const prMerged = status?.pr?.merged ?? false
  const prTitle = status?.pr?.title ?? null
  const liveNumber = status?.prNumber ?? prNumber
  const displayNumber = liveNumber ? `#${liveNumber}` : null
  const displayTitle = prTitle ?? 'Pull request'
  const ci = status?.ci ?? null
  const branch = status?.branch ?? null
  const liveBranchName = branch?.name ?? cardBranch
  const upstreamBehind = status?.upstreamBehind ?? 0
  const basedOn = dependsOn.length > 0 ? dependsOn[0].identifier : defaultBranch
  const isCardDependency = dependsOn.length > 0

  const checksUrl = liveBranchName
    ? `https://github.com/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}/commits/${encodeURIComponent(liveBranchName)}`
    : null

  const postMergeCommits = (prMerged && branch) ? branch.unpushedCommits : 0

  // State machine
  let state: PrState = 'hidden'
  if (isCreating) {
    state = 'updating'
  } else if (safePrUrl && prMerged && postMergeCommits > 0) {
    state = 'merged-new'
  } else if (safePrUrl && prMerged) {
    state = 'merged'
  } else if (safePrUrl) {
    state = 'open'
  } else if (hasCodeChanges) {
    state = 'create'
  }

  const invalidateBranchStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['branch-status', cardIdentifier] })
  }, [queryClient, cardIdentifier])

  const handleCreatePr = useCallback(async () => {
    setIsCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to create PR' }))
        throw new Error(data.error ?? 'Failed to create PR')
      }
      const data = await res.json()
      onPrCreated(data.prUrl, data.prNumber)
      invalidateBranchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PR')
    } finally {
      setIsCreating(false)
    }
  }, [cardId, onPrCreated, invalidateBranchStatus])

  const handleCopyBranch = useCallback(async (branchName: string) => {
    await navigator.clipboard.writeText(branchName)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [])

  const runOperation = useCallback(async (url: string, body: Record<string, unknown>) => {
    setIsOperating(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || 'Operation failed')
      }
      invalidateBranchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setIsOperating(false)
    }
  }, [invalidateBranchStatus])

  const handleCommit = useCallback(() => runOperation('/api/auto-commit', { cardId }), [cardId, runOperation])
  const handlePush = useCallback(() => runOperation('/api/git-push', { cardId }), [cardId, runOperation])
  const handlePull = useCallback(() => runOperation('/api/git-pull', { cardId }), [cardId, runOperation])

  const isMerged = state === 'merged' || state === 'merged-new'

  return {
    state,
    error,
    expanded,
    copied,
    isCreating,
    isOperating,
    safePrUrl,
    displayNumber,
    displayTitle,
    isMerged,
    ci,
    liveBranchName,
    basedOn,
    isCardDependency,
    upstreamBehind,
    postMergeCommits,
    checksUrl,
    localChanges: branch?.localChanges ?? 0,
    unpushedCommits: branch?.unpushedCommits ?? 0,
    remoteAhead: branch?.remoteAhead ?? 0,
    toggleExpanded: useCallback(() => setExpanded(e => !e), []),
    handleCreatePr,
    handleCopyBranch,
    handleCommit,
    handlePush,
    handlePull,
  }
}
