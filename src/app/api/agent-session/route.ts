import '../../../lib/ai/ensureSessionStorage'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@anthropic-ai/claude-agent-sdk'
import type { SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import type { ImageBlockParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages/messages'
import { readFile, mkdir, copyFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '../../../lib/prisma'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { buildSessionInstructions } from '../../../lib/ai/sessionPrompt'
import { isValidSkillId } from '../../../lib/skills/registry'
import { runJockeyAssessment } from '../../../lib/jockey/assess'
import type { JockeyAssessment } from '../../../lib/jockey/types'
import {
  ensureBareClone,
  createWorktree,
  worktreePath,
  autoCommit,
  getPendingChanges,
} from '../../../lib/git/worktree'
import { branchNameFromCard } from '../../../lib/git/branchNaming'

import { safeParseTouchedFiles } from '../../../lib/safeParseTouchedFiles'
import { publish as publishSessionEvent, close as closeSessionChannel } from '../../../lib/sessionEvents'
import { acquireAdvisoryLock, releaseAdvisoryLock } from '../../../lib/advisoryLock'

class StaleSessionError extends Error {
  constructor() {
    super('Stale session')
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser()

  const body = await request.json()
  const { cardId, sessionId: incomingSessionId, message, attachmentIds, skillId } = body as {
    cardId: string
    sessionId?: string
    message: string
    attachmentIds?: string[]
    skillId?: string
  }

  if (!cardId || !message) {
    return NextResponse.json({ error: 'Missing cardId or message' }, { status: 400 })
  }

  // Fetch card with context and verify team membership
  const card = await requireCardAccess(user.id, cardId)

  if (!card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }

  // Resolve or create ConversationSession
  let convSession
  if (incomingSessionId) {
    convSession = await prisma.conversationSession.findUnique({ where: { id: incomingSessionId } })
    if (!convSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (convSession.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (convSession.cardId !== cardId) {
      return NextResponse.json({ error: 'Session does not belong to this card' }, { status: 400 })
    }
  } else {
    convSession = await prisma.conversationSession.create({
      data: {
        userId: user.id,
        cardId,
        teamId: card.teamId,
      },
    })
  }

  // Mark session as active immediately — before any SDK setup, so the
  // sidebar and other views reflect activity during the setup phase
  await prisma.conversationSession.update({
    where: { id: convSession.id },
    data: { agentActiveAt: new Date() },
  })

  const convSessionId = convSession.id
  const isFirstMessage = convSession.messageCount === 0

  const { project } = card.team
  const { owner, repoName, defaultBranch } = project

  // Ensure bare clone exists and is fresh
  await ensureBareClone(owner, repoName, user.accessToken)

  // Ensure worktree exists
  const branchName = card.cardBranch ?? branchNameFromCard(card.identifier)
  await createWorktree(owner, repoName, card.identifier, branchName, defaultBranch)
  const wtPath = worktreePath(owner, repoName, card.identifier)

  // Update card status and branch if needed
  if (card.status === 'NOT_STARTED' || !card.cardBranch) {
    await prisma.card.update({
      where: { id: cardId },
      data: {
        status: card.status === 'NOT_STARTED' ? 'SPECIFYING' : card.status,
        cardBranch: branchName,
        lastActivityAt: new Date(),
      },
    })
  } else {
    await prisma.card.update({
      where: { id: cardId },
      data: { lastActivityAt: new Date() },
    })
  }

  // Load all relevant attachments in a single query:
  // - message-level attachments (by ID)
  // - card-level attachments (description, no comment)
  const allAttachments = await prisma.attachment.findMany({
    where: {
      OR: [
        ...(attachmentIds?.length ? [{ id: { in: attachmentIds } }] : []),
        { cardId, commentId: null },
      ],
    },
  })

  const messageAttachments = attachmentIds?.length
    ? allAttachments.filter((a) => attachmentIds.includes(a.id))
    : []

  // Copy attachments to worktree for persistence, skipping already-copied files
  if (allAttachments.length > 0) {
    const attachDir = path.join(wtPath, '.workhorse', 'attachments', card.identifier.toLowerCase())
    await mkdir(attachDir, { recursive: true })
    for (const att of allAttachments) {
      const dest = path.join(attachDir, att.fileName)
      if (existsSync(dest)) continue
      try {
        await copyFile(att.storagePath, dest)
      } catch {
        // Source missing — continue
      }
    }
  }

  // Build deduplicated attachment file list for the prompt context
  const allAttachmentFiles = [...new Set(allAttachments.map((a) => a.fileName))]

  // Build session instructions with skill-specific context
  const sessionInstructions = buildSessionInstructions({
    cardTitle: card.title,
    cardDescription: card.description,
    cardIdentifier: card.identifier,
    projectName: project.name,
    repoOwner: owner,
    repoName,
    attachmentFiles: allAttachmentFiles.length > 0 ? allAttachmentFiles : undefined,
    skillId: isValidSkillId(skillId) ? skillId : undefined,
  })

  // Build multimodal prompt if there are raster image attachments (exclude SVG — not a valid
  // Claude API image media_type, and can contain scripts). Cap at 5 to limit memory usage.
  const imageAttachments = messageAttachments
    .filter((a) => a.mimeType.startsWith('image/') && a.mimeType !== 'image/svg+xml')
    .slice(0, 5)

  let promptInput: string | AsyncIterable<SDKUserMessage>

  if (imageAttachments.length > 0) {
    // Build properly typed content blocks
    const contentBlocks: Array<ImageBlockParam | TextBlockParam> = []

    for (const att of imageAttachments) {
      try {
        const data = await readFile(att.storagePath)
        const imageBlock: ImageBlockParam = {
          type: 'image',
          source: {
            type: 'base64',
            media_type: att.mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
            data: data.toString('base64'),
          },
        }
        contentBlocks.push(imageBlock)
      } catch {
        // Skip unreadable files
      }
    }

    if (message.trim()) {
      const textBlock: TextBlockParam = { type: 'text', text: message }
      contentBlocks.push(textBlock)
    }

    async function* generatePrompt(): AsyncGenerator<SDKUserMessage> {
      yield {
        type: 'user',
        message: { role: 'user', content: contentBlocks },
        parent_tool_use_id: null,
      } as SDKUserMessage
    }

    promptInput = generatePrompt()
  } else {
    promptInput = message
  }

  // Skills that run extended implementation work get unlimited turns.
  // All other skills get a capped limit to prevent runaway sessions.
  const UNLIMITED_TURN_SKILLS = new Set(['implement', 'fix_ci'])
  const resolvedSkillId = isValidSkillId(skillId) ? skillId : undefined
  const maxTurns = resolvedSkillId && UNLIMITED_TURN_SKILLS.has(resolvedSkillId) ? undefined : 10

  // Configure Agent SDK query
  const options: Parameters<typeof query>[0]['options'] = {
    cwd: wtPath,
    tools: ['Read', 'Glob', 'Grep', 'Write', 'Edit'],
    permissionMode: 'acceptEdits' as const,
    systemPrompt: {
      type: 'preset' as const,
      preset: 'claude_code' as const,
      append: sessionInstructions,
    },
    settingSources: ['project' as const],
    includePartialMessages: true,
    model: 'claude-opus-4-6',
    ...(maxTurns !== undefined ? { maxTurns } : {}),
    persistSession: true,
    ...(convSession.agentSessionId ? { resume: convSession.agentSessionId } : {}),
  }

  // Fire off the agent query in the background — events are delivered
  // to the client via the /api/sessions/[id]/events SSE endpoint
  runAgentInBackground({
    promptInput,
    options,
    convSession,
    convSessionId,
    isFirstMessage,
    owner,
    repoName,
    card,
    cardId,
    user,
    message,
  })

  // Return immediately with the session ID so the client can subscribe
  return NextResponse.json({ sessionId: convSessionId })
}

/**
 * Run the Agent SDK query in the background. All events are published to
 * the in-memory pub/sub channel; the client subscribes via
 * /api/sessions/[id]/events.
 */
function runAgentInBackground(ctx: {
  promptInput: string | AsyncIterable<SDKUserMessage>
  options: Parameters<typeof query>[0]['options']
  convSession: { agentSessionId: string | null; title: string | null }
  convSessionId: string
  isFirstMessage: boolean
  owner: string
  repoName: string
  card: { id: string; identifier: string; title: string; status: string; team: { colour: string; project: { name: string } } }
  cardId: string
  user: { id: string; displayName: string; githubUsername: string; accessToken: string }
  message: string
}) {
  // Use an unhandled-safe async IIFE so errors don't crash the process
  void (async () => {
    let agentSdkSessionId = ctx.convSession.agentSessionId ?? ''

    // Acquire advisory lock — released on completion or implicitly on crash
    await acquireAdvisoryLock(ctx.convSessionId)

    try {
      let agentQuery: ReturnType<typeof query>

      try {
        agentQuery = query({ prompt: ctx.promptInput, options: ctx.options })
        // Eagerly pull the first event to detect stale session errors early
        const firstChunk = await (agentQuery as AsyncIterable<unknown>)[Symbol.asyncIterator]().next()
        if (!firstChunk.done) {
          const event = firstChunk.value as Record<string, unknown>

          // Check if the first event itself is an error about a missing session
          if (
            event.type === 'result' &&
            event.subtype === 'error_during_execution' &&
            Array.isArray(event.errors) &&
            (event.errors as string[]).some((e: string) => e.includes('No conversation found with session ID'))
          ) {
            throw new StaleSessionError()
          }

          // Process the first event normally
          if (!agentSdkSessionId && 'session_id' in event && event.session_id) {
            agentSdkSessionId = event.session_id as string
            await prisma.conversationSession.update({
              where: { id: ctx.convSessionId },
              data: { agentSessionId: agentSdkSessionId },
            })
          }
          publishSessionEvent(ctx.convSessionId, event as Record<string, unknown>)
        }
      } catch (err) {
        // If the session ID is stale, clear it and retry without resume
        const isStaleSession =
          err instanceof StaleSessionError ||
          (err instanceof Error && err.message.includes('No conversation found with session ID'))

        if (isStaleSession && ctx.convSession.agentSessionId) {
          console.warn(`Stale agent session ${ctx.convSession.agentSessionId} for conversation ${ctx.convSessionId}, starting fresh`)
          agentSdkSessionId = ''
          await prisma.conversationSession.update({
            where: { id: ctx.convSessionId },
            data: { agentSessionId: null },
          })
          // Retry without resume
          const freshOptions = { ...ctx.options }
          delete (freshOptions as Record<string, unknown>).resume
          agentQuery = query({ prompt: ctx.promptInput, options: freshOptions })
        } else {
          throw err
        }
      }

      let assistantText = ''

      for await (const event of agentQuery) {
        // Capture agent SDK session ID from first message
        if (!agentSdkSessionId && 'session_id' in event && event.session_id) {
          agentSdkSessionId = event.session_id
          await prisma.conversationSession.update({
            where: { id: ctx.convSessionId },
            data: { agentSessionId: agentSdkSessionId },
          })
        }

        // Capture assistant text for title refinement
        if (event.type === 'assistant') {
          const msg = (event as unknown as Record<string, unknown>).message as Record<string, unknown> | undefined
          if (msg?.content && Array.isArray(msg.content)) {
            const text = (msg.content as Array<Record<string, unknown>>)
              .filter((c) => c.type === 'text')
              .map((c) => c.text as string)
              .join('')
            if (text) assistantText += text
          }
        }

        // Publish event to session channel for subscribers
        publishSessionEvent(ctx.convSessionId, event as Record<string, unknown>)
      }

      // Agent turn complete — auto-commit, update session metadata
      await finaliseSessionAfterExchange({
        owner: ctx.owner,
        repoName: ctx.repoName,
        card: ctx.card,
        cardId: ctx.cardId,
        user: ctx.user,
        convSessionId: ctx.convSessionId,
        isFirstMessage: ctx.isFirstMessage,
        convSessionTitle: ctx.convSession.title,
        message: ctx.message,
        cardTitle: ctx.card.title,
        assistantText,
      })

      // Run jockey assessment and publish result via pub/sub
      try {
        const jockeyResult = await runJockeyAfterExchange(
          ctx.cardId,
          ctx.convSessionId,
          ctx.card.title,
          ctx.card.status,
          ctx.message,
          assistantText,
        )
        if (jockeyResult) {
          publishSessionEvent(ctx.convSessionId, { type: 'jockey', ...jockeyResult })
        }
      } catch (jockeyErr) {
        console.warn('[jockey] Post-exchange assessment failed:', jockeyErr)
      }

      // Clear activity status, release lock, and close session channel
      await releaseAdvisoryLock(ctx.convSessionId)
      await prisma.conversationSession.update({
        where: { id: ctx.convSessionId },
        data: { agentActiveAt: null },
      }).catch(() => {})
      closeSessionChannel(ctx.convSessionId)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Agent session failed'
      publishSessionEvent(ctx.convSessionId, { type: 'error', message: errorMsg })
      // Clear activity status, release lock, and close session channel on error too
      await releaseAdvisoryLock(ctx.convSessionId)
      await prisma.conversationSession.update({
        where: { id: ctx.convSessionId },
        data: { agentActiveAt: null },
      }).catch(() => {})
      closeSessionChannel(ctx.convSessionId)
    }
  })()
}

/**
 * Post-agent cleanup: auto-commit, update session metadata.
 * Only called on the success path (full agent response received).
 */
async function finaliseSessionAfterExchange(
  ctx: {
    owner: string
    repoName: string
    card: { identifier: string }
    cardId: string
    user: { id: string; displayName: string; githubUsername: string; accessToken: string }
    convSessionId: string
    isFirstMessage: boolean
    convSessionTitle: string | null
    message: string
    cardTitle: string
    assistantText: string
  },
) {
  try {
    const pending = await getPendingChanges(ctx.owner, ctx.repoName, ctx.card.identifier)
    const commitMessage = buildCommitMessage(ctx.card.identifier, pending)

    const changedFiles = await autoCommit(
      ctx.owner,
      ctx.repoName,
      ctx.card.identifier,
      commitMessage,
      ctx.user.displayName,
      `${ctx.user.githubUsername}@users.noreply.github.com`,
      ctx.user.accessToken,
    )

    if (changedFiles.length > 0) {
      const freshCard = await prisma.card.findUnique({ where: { id: ctx.cardId } })
      const existingFiles = safeParseTouchedFiles(freshCard?.touchedFiles ?? '[]')
      const allFiles = [...new Set([...existingFiles, ...changedFiles])]
      await prisma.card.update({
        where: { id: ctx.cardId },
        data: { touchedFiles: JSON.stringify(allFiles) },
      })

      publishSessionEvent(ctx.convSessionId, { type: 'commit', files: changedFiles })
    }
  } catch (commitErr) {
    console.error('Auto-commit failed:', commitErr)
  }

  // Update conversation session metadata
  const now = new Date()
  const updateData: Record<string, unknown> = {
    messageCount: { increment: 2 },
    lastMessageAt: now,
    dismissedFromRecent: false,
  }

  if (ctx.isFirstMessage && !ctx.convSessionTitle) {
    updateData.title = generateSessionTitle(ctx.message, ctx.cardTitle, ctx.assistantText)
  }

  const updatedSession = await prisma.conversationSession.update({
    where: { id: ctx.convSessionId },
    data: updateData,
    select: { title: true },
  })

  // Publish title update via pub/sub so the client can update
  if (updatedSession.title) {
    publishSessionEvent(ctx.convSessionId, {
      type: 'session_update',
      sessionId: ctx.convSessionId,
      title: updatedSession.title,
    })
  }

  // Sidebar picks up the changes automatically via DB LISTEN/NOTIFY trigger
}

/**
 * Build a meaningful commit message from the list of pending changed files.
 *
 * Examples:
 *   WH-042: add allergies spec
 *   WH-042: update 3 specs
 *   WH-048: add ward-overview mockup
 *   WH-042: update commit-messages spec and add mockup
 */
function buildCommitMessage(
  cardIdentifier: string,
  pending: { filePath: string; isNew: boolean }[],
): string {
  const prefix = cardIdentifier.toUpperCase()

  if (pending.length === 0) return `${prefix}: update files`

  const specs = pending.filter((f) => f.filePath.startsWith('.workhorse/specs/'))
  const mockups = pending.filter((f) => f.filePath.startsWith('.workhorse/design/mockups/'))
  const codeFiles = pending.filter((f) => !f.filePath.startsWith('.workhorse/'))

  const parts: string[] = []

  // Specs
  if (specs.length === 1) {
    const slug = specs[0].filePath.split('/').pop()?.replace(/\.md$/, '') ?? 'spec'
    const verb = specs[0].isNew ? 'add' : 'update'
    parts.push(`${verb} ${slug} spec`)
  } else if (specs.length > 1) {
    const verb = specs.every((f) => f.isNew) ? 'add' : 'update'
    parts.push(`${verb} ${specs.length} specs`)
  }

  // Mockups
  if (mockups.length === 1) {
    const slug = mockups[0].filePath.split('/').pop()?.replace(/\.html$/, '') ?? 'mockup'
    const verb = mockups[0].isNew ? 'add' : 'update'
    parts.push(`${verb} ${slug} mockup`)
  } else if (mockups.length > 1) {
    const allNew = mockups.every((f) => f.isNew)
    const verb = allNew ? 'add' : 'update'
    parts.push(`${verb} ${mockups.length} mockups`)
  }

  // Code files (non-.workhorse)
  if (codeFiles.length > 0) {
    parts.push(`update code`)
  }

  // Fallback for .workhorse files that aren't specs or mockups
  if (parts.length === 0) {
    parts.push('update files')
  }

  return `${prefix}: ${parts.join(', ')}`
}

/** Known action pill messages that make poor session titles. */
const PILL_MESSAGES = new Set([
  'Interview me on this card',
  'Draft a spec from the card description',
  'Where were we up to? Summarise what we have so far and what remains.',
  'Continue the spec interview',
  'Review the current specs',
  'Switch to interview mode — ask me probing questions',
  'Review the current specs for gaps and contradictions',
  'Make specific changes to the specs',
  'Review this spec',
  'Make changes to the spec',
  'Start implementing from the specs',
  'Audit the implementation against the design system',
  'Audit the implementation for security concerns',
])

/**
 * Generate a session title from the exchange context.
 *
 * Priority:
 * 1. If the user message is a known pill, try to derive a title from the assistant's response
 * 2. If the user message is substantive, use it
 * 3. Fall back to the card title
 */
function generateSessionTitle(message: string, cardTitle: string, assistantText: string): string {
  const isPillMessage = PILL_MESSAGES.has(message.trim())

  // If not a pill message, use the user's message
  if (!isPillMessage) {
    const title = truncateTitle(message)
    if (title) return title
  }

  // Try to extract a meaningful title from the assistant's response
  if (assistantText) {
    const title = extractTitleFromAssistant(assistantText)
    if (title) return title
  }

  // Fall back to the card title
  if (cardTitle && cardTitle !== 'Untitled spec') {
    return truncateTitle(cardTitle) || 'New conversation'
  }

  return 'New conversation'
}

/** Extract a title from the first meaningful sentence of the assistant's response. */
function extractTitleFromAssistant(text: string): string | null {
  // Skip common greetings/preamble
  const lines = text.trim().split('\n').filter((l) => l.trim().length > 0)
  for (const line of lines.slice(0, 5)) {
    const clean = line.replace(/^#+\s*/, '').replace(/^\*\*(.+?)\*\*/, '$1').trim()
    // Skip very short lines (headings like "Summary") or lines that are just markdown
    if (clean.length < 10) continue
    if (clean.startsWith('```') || clean.startsWith('|') || clean.startsWith('- [')) continue
    return truncateTitle(clean)
  }
  return null
}

/** Truncate text to a clean ~60 char title at a word boundary. */
function truncateTitle(text: string): string {
  const firstLine = text.trim().split('\n')[0]
  const sentenceMatch = firstLine.match(/^[^.!?]+[.!?]?/)
  const sentence = sentenceMatch?.[0] ?? firstLine
  if (sentence.length <= 60) return sentence.trim()
  const truncated = sentence.slice(0, 60)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated).trim() + '…'
}

/**
 * Run the jockey after an agent exchange. Reads the card's journal and recent
 * conversation, calls Haiku for an assessment, and persists any new journal entries.
 */
async function runJockeyAfterExchange(
  cardId: string,
  convSessionId: string,
  cardTitle: string,
  cardStatus: string,
  userMessage: string,
  assistantText: string,
): Promise<JockeyAssessment | null> {
  try {
    // Fetch current state
    const [journalEntries, scheduledSteps, card] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { cardId },
        orderBy: { createdAt: 'asc' },
        select: { type: true, summary: true, createdAt: true },
        take: 100,
      }),
      prisma.scheduledStep.findMany({
        where: { cardId },
        orderBy: { position: 'asc' },
        select: { id: true, skillId: true, position: true },
      }),
      prisma.card.findUnique({
        where: { id: cardId },
        select: { touchedFiles: true, prUrl: true },
      }),
    ])

    const touchedFiles = safeParseTouchedFiles(card?.touchedFiles ?? '[]')
    const hasSpecs = touchedFiles.some(f => f.startsWith('.workhorse/specs/'))
    const hasCodeChanges = touchedFiles.some(f => !f.startsWith('.workhorse/'))

    // Build recent messages from the current exchange
    // (We don't have the full transcript here, so we use the current user + assistant messages)
    const recentMessages: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: userMessage },
    ]
    if (assistantText) {
      recentMessages.push({ role: 'assistant', content: assistantText })
    }

    const assessment = await runJockeyAssessment({
      journalEntries,
      scheduledSteps,
      recentMessages,
      newMessageCount: recentMessages.length,
      cardTitle,
      cardStatus,
      hasSpecs,
      hasCodeChanges,
      hasPr: !!card?.prUrl,
    })

    // Persist new journal entries — sanitise LLM output before storing
    if (assessment.journalEntries.length > 0) {
      await prisma.journalEntry.createMany({
        data: assessment.journalEntries.map(entry => ({
          cardId,
          // Constrain type to alphanumeric + hyphens, max 50 chars
          type: entry.type.replace(/[^a-z0-9-]/gi, '').slice(0, 50) || 'general',
          // Length-limit summary to prevent unbounded storage
          summary: entry.summary.slice(0, 500),
        })),
      })
    }

    // Update jockey cursor atomically — messageCount may have been
    // incremented by finaliseSessionAfterExchange since we read it.
    await prisma.conversationSession.update({
      where: { id: convSessionId },
      data: { jockeyCursor: { increment: recentMessages.length } },
    }).catch(() => {
      // Session may have been deleted concurrently
    })

    // Handle scheduled step auto-start
    if (assessment.startNextScheduled && scheduledSteps.length > 0) {
      // Remove the first scheduled step (it's being started)
      await prisma.scheduledStep.delete({
        where: { id: scheduledSteps[0].id },
      }).catch(() => {
        // Step may have been cancelled concurrently, ignore
      })
    }

    // Sanitise activeStep — strip any HTML tags as defence-in-depth
    if (assessment.activeStep) {
      assessment.activeStep = assessment.activeStep.replace(/<[^>]*>/g, '').slice(0, 200)
    }

    return assessment
  } catch (error) {
    console.warn('[jockey] Post-exchange assessment failed:', error)
    return null
  }
}
