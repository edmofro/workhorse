import { NextRequest } from 'next/server'
import { anthropic } from '../../../lib/anthropic'
import { prisma } from '../../../lib/prisma'
import { requireUser } from '../../../lib/auth/session'
import { buildSystemPrompt } from '../../../lib/ai/systemPrompt'

export async function POST(request: NextRequest) {
  await requireUser()

  const body = await request.json()
  const { cardId, message, userId } = body as {
    cardId: string
    message: string
    userId: string
  }

  // Fetch card with context
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      team: { include: { project: true } },
      specs: true,
      specMessages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!card) {
    return new Response('Card not found', { status: 404 })
  }

  // Save the user's message
  await prisma.specMessage.create({
    data: {
      cardId,
      userId,
      role: 'user',
      content: message,
    },
  })

  // Update status to SPECIFYING if not already
  if (card.status === 'NOT_STARTED') {
    await prisma.card.update({
      where: { id: cardId },
      data: { status: 'SPECIFYING' },
    })
  }

  // Build conversation history — include ALL specs for multi-spec cards (WH-018)
  const existingSpecContent =
    card.specs.length > 0
      ? card.specs.map((s) => `<!-- ${s.filePath} -->\n${s.content}`).join('\n\n---\n\n')
      : null
  const systemPrompt = buildSystemPrompt({
    cardTitle: card.title,
    cardDescription: card.description,
    cardIdentifier: card.identifier,
    existingSpecContent,
    projectName: card.team.project.name,
    repoInfo: {
      owner: card.team.project.owner,
      repoName: card.team.project.repoName,
    },
  })

  const messages = card.specMessages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Add the new user message
  messages.push({ role: 'user', content: message })

  // Filter to only user/assistant messages
  const chatMessages = messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant',
  )

  // Stream the response
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: chatMessages,
  })

  let fullResponse = ''

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullResponse += event.delta.text
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }

        // Save the assistant's full response
        await prisma.specMessage.create({
          data: {
            cardId,
            role: 'assistant',
            content: fullResponse,
          },
        })

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  })
}
