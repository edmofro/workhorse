/**
 * GET /api/jockey?cardId=xxx
 * Returns the current jockey state for a card (journal, scheduled steps, pills, suggestions).
 * Used on initial card load — uses deterministic defaults for pills/suggestions
 * to keep page load fast. The LLM-based assessment runs after each conversation exchange.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { getDefaultPills, getDefaultSuggestions } from '../../../lib/jockey/assess'
import { safeParseTouchedFiles } from '../../../lib/safeParseTouchedFiles'

export async function GET(request: NextRequest) {
  const user = await requireUser()
  const cardId = request.nextUrl.searchParams.get('cardId')

  if (!cardId) {
    return NextResponse.json({ error: 'Missing cardId' }, { status: 400 })
  }

  const card = await requireCardAccess(user.id, cardId)
  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  const [journalEntries, scheduledSteps] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, type: true, summary: true, createdAt: true },
      take: 100,
    }),
    prisma.scheduledStep.findMany({
      where: { cardId },
      orderBy: { position: 'asc' },
      select: { id: true, skillId: true, position: true },
    }),
  ])

  const touchedFiles = safeParseTouchedFiles(card.touchedFiles ?? '[]')
  const hasSpecs = touchedFiles.some(f => f.startsWith('.workhorse/specs/'))
  const hasCodeChanges = touchedFiles.some(f => !f.startsWith('.workhorse/'))
  const hasPr = !!card.prUrl

  // Use deterministic defaults for fast initial load — no LLM call.
  // The first conversation exchange triggers a full jockey assessment.
  const pills = getDefaultPills({ hasCodeChanges, hasPr, hasSpecs, journalEntries })
  const suggestions = getDefaultSuggestions({ hasSpecs, journalEntries })

  return NextResponse.json({
    journalEntries: journalEntries.map(e => ({
      id: e.id,
      type: e.type,
      summary: e.summary,
      createdAt: e.createdAt.toISOString(),
    })),
    scheduledSteps: scheduledSteps.map(s => ({
      id: s.id,
      skillId: s.skillId,
      position: s.position,
    })),
    pills,
    suggestions,
    activeStep: null,
    hasCodeChanges,
  })
}
