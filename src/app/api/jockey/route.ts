/**
 * GET /api/jockey?cardId=xxx
 * Returns the current jockey state for a card (journal, scheduled steps, pills, suggestions).
 * Used on initial card load — the SSE stream handles updates during conversation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { runJockeyAssessment } from '../../../lib/jockey/assess'
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

  // Run a quick assessment to get current pills and suggestions
  const assessment = await runJockeyAssessment({
    journalEntries: journalEntries.map(e => ({
      type: e.type,
      summary: e.summary,
      createdAt: e.createdAt,
    })),
    scheduledSteps: scheduledSteps.map(s => ({
      skillId: s.skillId,
      position: s.position,
    })),
    recentMessages: [],
    newMessageCount: 0,
    cardTitle: card.title,
    cardStatus: card.status,
    hasSpecs,
    hasCodeChanges,
    hasPr: !!card.prUrl,
  })

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
    pills: assessment.pills,
    suggestions: assessment.suggestions,
    activeStep: assessment.activeStep,
    hasCodeChanges,
  })
}
