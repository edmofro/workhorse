import '../../../lib/ai/ensureSessionStorage'
import { NextRequest } from 'next/server'
import { query } from '@anthropic-ai/claude-agent-sdk'
import type { SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import type { ImageBlockParam, TextBlockParam } from '@anthropic-ai/sdk/resources/messages/messages'
import { readFile, mkdir, copyFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { prisma } from '../../../lib/prisma'
import { requireUser, requireCardAccess } from '../../../lib/auth/session'
import { buildSessionInstructions } from '../../../lib/ai/sessionPrompt'
import { isValidAgentMode } from '../../../lib/ai/workhorseContext'
import {
  ensureBareClone,
  createWorktree,
  worktreePath,
  autoCommit,
} from '../../../lib/git/worktree'
import { branchNameFromCard } from '../../../lib/git/branchNaming'
import { releaseAllLocks, AI_LOCK_AGENT } from '../../../lib/fileLock'
import { safeParseTouchedFiles } from '../../../lib/safeParseTouchedFiles'

class StaleSessionError extends Error {
  constructor() {
    super('Stale session')
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser()

  const body = await request.json()
  const { cardId, sessionId: incomingSessionId, message, attachmentIds, mode } = body as {
    cardId: string
    sessionId?: string
    message: string
    attachmentIds?: string[]
    mode?: string
  }

  if (!cardId || !message) {
    return new Response('Missing cardId or message', { status: 400 })
  }

  // Fetch card with context and verify team membership
  const card = await requireCardAccess(user.id, cardId)

  if (!card) {
    return new Response('Card not found', { status: 404 })
  }

  // Resolve or create ConversationSession
  let convSession
  if (incomingSessionId) {
    convSession = await prisma.conversationSession.findUnique({ where: { id: incomingSessionId } })
    if (!convSession) {
      return new Response('Session not found', { status: 404 })
    }
    if (convSession.userId !== user.id) {
      return new Response('Forbidden', { status: 403 })
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

  // Build session instructions with mode-specific context
  const sessionInstructions = buildSessionInstructions({
    cardTitle: card.title,
    cardDescription: card.description,
    cardIdentifier: card.identifier,
    projectName: project.name,
    repoOwner: owner,
    repoName,
    attachmentFiles: allAttachmentFiles.length > 0 ? allAttachmentFiles : undefined,
    mode: isValidAgentMode(mode) ? mode : undefined,
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
    model: 'claude-sonnet-4-6',
    maxTurns: 10,
    persistSession: true,
    ...(convSession.agentSessionId ? { resume: convSession.agentSessionId } : {}),
  }

  // Stream SSE to the client
  const encoder = new TextEncoder()
  let agentSdkSessionId = convSession.agentSessionId ?? ''
  const convSessionId = convSession.id
  const isFirstMessage = convSession.messageCount === 0

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let agentQuery: ReturnType<typeof query>

        try {
          agentQuery = query({ prompt: promptInput, options })
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
                where: { id: convSessionId },
                data: { agentSessionId: agentSdkSessionId },
              })
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
          }
        } catch (err) {
          // If the session ID is stale, clear it and retry without resume
          const isStaleSession =
            err instanceof StaleSessionError ||
            (err instanceof Error && err.message.includes('No conversation found with session ID'))

          if (isStaleSession && convSession.agentSessionId) {
            console.warn(`Stale agent session ${convSession.agentSessionId} for conversation ${convSessionId}, starting fresh`)
            agentSdkSessionId = ''
            await prisma.conversationSession.update({
              where: { id: convSessionId },
              data: { agentSessionId: null },
            })
            // Retry without resume
            const freshOptions = { ...options }
            delete (freshOptions as Record<string, unknown>).resume
            agentQuery = query({ prompt: promptInput, options: freshOptions })
          } else {
            throw err
          }
        }

        for await (const event of agentQuery) {
          // Capture agent SDK session ID from first message
          if (!agentSdkSessionId && 'session_id' in event && event.session_id) {
            agentSdkSessionId = event.session_id
            await prisma.conversationSession.update({
              where: { id: convSessionId },
              data: { agentSessionId: agentSdkSessionId },
            })
          }

          // Stream event as SSE
          const sseData = JSON.stringify(event)
          controller.enqueue(
            encoder.encode(`data: ${sseData}\n\n`),
          )
        }

        // Agent turn complete — auto-commit and release locks
        try {
          const changedFiles = await autoCommit(
            owner,
            repoName,
            card.identifier,
            'Update specs from interview',
            user.displayName,
            `${user.githubUsername}@users.noreply.github.com`,
            user.accessToken,
          )

          if (changedFiles.length > 0) {
            // Update touched files on card
            const freshCard = await prisma.card.findUnique({ where: { id: cardId } })
            const existingFiles = safeParseTouchedFiles(freshCard?.touchedFiles ?? '[]')
            const allFiles = [...new Set([...existingFiles, ...changedFiles])]
            await prisma.card.update({
              where: { id: cardId },
              data: { touchedFiles: JSON.stringify(allFiles) },
            })

            // Send commit notification
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'commit', files: changedFiles })}\n\n`,
              ),
            )
          }
        } catch (commitErr) {
          // Log but don't fail the response
          console.error('Auto-commit failed:', commitErr)
        }

        // Release AI locks
        await releaseAllLocks(cardId, AI_LOCK_AGENT)

        // Update conversation session metadata
        const now = new Date()
        const updateData: Record<string, unknown> = {
          messageCount: { increment: 2 }, // user + assistant
          lastMessageAt: now,
        }

        // Auto-title from first user message if this is the first exchange
        if (isFirstMessage && !convSession.title) {
          updateData.title = generateSessionTitle(message)
        }

        await prisma.conversationSession.update({
          where: { id: convSessionId },
          data: updateData,
        })

        // Send conversation session info to client
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'session', sessionId: convSessionId })}\n\n`,
          ),
        )

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Interview failed'
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: errorMsg })}\n\n`,
          ),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

/**
 * Generate a short session title from the user's first message.
 * Simple heuristic: take the first sentence/clause, truncate to ~50 chars.
 */
function generateSessionTitle(message: string): string {
  // Strip leading whitespace and take the first line
  const firstLine = message.trim().split('\n')[0]
  // Take first sentence (end at period, question mark, or exclamation)
  const sentenceMatch = firstLine.match(/^[^.!?]+[.!?]?/)
  const sentence = sentenceMatch?.[0] ?? firstLine
  // Truncate to ~50 chars at a word boundary
  if (sentence.length <= 50) return sentence.trim()
  const truncated = sentence.slice(0, 50)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated).trim() + '…'
}
