import '../../../lib/ai/ensureSessionStorage'
import { NextRequest } from 'next/server'
import { query } from '@anthropic-ai/claude-agent-sdk'
import { prisma } from '../../../lib/prisma'
import { requireUser } from '../../../lib/auth/session'
import { worktreePath, worktreeExists } from '../../../lib/git/worktree'
import { buildAutoReviewPrompt } from '../../../lib/ai/freshEyesReview'

export async function POST(request: NextRequest) {
  await requireUser()

  const body = await request.json()
  const { cardId } = body as { cardId: string }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      team: { include: { project: true } },
    },
  })

  if (!card) {
    return new Response('Card not found', { status: 404 })
  }

  const { owner, repoName } = card.team.project

  // Check if worktree exists
  const hasWorktree = await worktreeExists(owner, repoName, card.identifier)
  if (!hasWorktree) {
    return new Response('No worktree available for review', { status: 400 })
  }

  const wtPath = worktreePath(owner, repoName, card.identifier)

  const reviewPrompt = buildAutoReviewPrompt('', card.title)
  const fullPrompt = `${reviewPrompt}\n\nRead the spec files in .workhorse/specs/ and review them. Do not modify any files.`

  // Stream SSE to the client
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const agentQuery = query({
          prompt: fullPrompt,
          options: {
            cwd: wtPath,
            tools: ['Read', 'Glob', 'Grep'],
            permissionMode: 'dontAsk' as const,
            persistSession: false,
            includePartialMessages: true,
            model: 'claude-sonnet-4-6',
            maxTurns: 2,
            systemPrompt: {
              type: 'preset' as const,
              preset: 'claude_code' as const,
              append: 'You are a spec reviewer. Read the spec files and provide a thorough review. Do NOT modify any files.',
            },
          },
        })

        for await (const event of agentQuery) {
          // Extract text from streaming events
          if (event.type === 'stream_event') {
            const streamEvent = event.event as unknown as Record<string, unknown> | undefined
            if (streamEvent?.type === 'content_block_delta') {
              const delta = streamEvent.delta as Record<string, unknown> | undefined
              if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
                controller.enqueue(encoder.encode(delta.text))
              }
            }
          }

          // Handle complete assistant messages
          if (event.type === 'assistant') {
            const msg = event.message as unknown as Record<string, unknown> | undefined
            if (msg?.content && Array.isArray(msg.content)) {
              const textParts = (msg.content as Array<Record<string, unknown>>)
                .filter((c) => c.type === 'text')
                .map((c) => c.text as string)
                .join('')

              if (textParts) {
                controller.enqueue(encoder.encode(textParts))
              }
            }
          }
        }

        controller.close()
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Review failed'
        controller.enqueue(encoder.encode(`Review error: ${errorMsg}`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
