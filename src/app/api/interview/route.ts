import { NextRequest } from 'next/server'
import { query } from '@anthropic-ai/claude-agent-sdk'
import { prisma } from '../../../lib/prisma'
import { requireUser } from '../../../lib/auth/session'
import { buildInterviewInstructions } from '../../../lib/ai/interviewPrompt'
import {
  createBareClone,
  fetchBareClone,
  createWorktree,
  worktreePath,
  autoCommit,
} from '../../../lib/git/worktree'
import { branchNameFromCard } from '../../../lib/git/branchNaming'
import { releaseAllLocks } from '../../../lib/fileLock'

export async function POST(request: NextRequest) {
  const user = await requireUser()

  const body = await request.json()
  const { cardId, message } = body as {
    cardId: string
    message: string
  }

  // Fetch card with context
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      team: { include: { project: true } },
    },
  })

  if (!card) {
    return new Response('Card not found', { status: 404 })
  }

  const { project } = card.team
  const { owner, repoName, defaultBranch } = project

  // Ensure bare clone exists and is fresh
  await createBareClone(owner, repoName, user.accessToken)
  await fetchBareClone(owner, repoName, user.accessToken)

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

  // Build interview instructions
  const interviewInstructions = buildInterviewInstructions({
    cardTitle: card.title,
    cardDescription: card.description,
    cardIdentifier: card.identifier,
    projectName: project.name,
    repoOwner: owner,
    repoName,
  })

  // Configure Agent SDK query
  const options: Parameters<typeof query>[0]['options'] = {
    cwd: wtPath,
    tools: ['Read', 'Glob', 'Grep', 'Write', 'Edit'],
    permissionMode: 'acceptEdits' as const,
    systemPrompt: {
      type: 'preset' as const,
      preset: 'claude_code' as const,
      append: interviewInstructions,
    },
    settingSources: ['project' as const],
    includePartialMessages: true,
    model: 'claude-sonnet-4-6',
    maxTurns: 3,
    persistSession: true,
    ...(card.agentSessionId ? { resume: card.agentSessionId } : {}),
  }

  // Stream SSE to the client
  const encoder = new TextEncoder()
  let sessionId = card.agentSessionId ?? ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const agentQuery = query({ prompt: message, options })

        for await (const event of agentQuery) {
          // Capture session ID from first message
          if (!sessionId && 'session_id' in event && event.session_id) {
            sessionId = event.session_id
            // Save session ID to card
            await prisma.card.update({
              where: { id: cardId },
              data: { agentSessionId: sessionId },
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
            'Update specs from interview', // Will be overridden by AI-generated message below
            user.displayName,
            `${user.githubUsername}@users.noreply.github.com`,
            user.accessToken,
          )

          if (changedFiles.length > 0) {
            // Update touched files on card
            const existingFiles: string[] = JSON.parse(card.touchedFiles)
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
        await releaseAllLocks(cardId, 'ai-interviewer')

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
