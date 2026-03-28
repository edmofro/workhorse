import { NextRequest } from 'next/server'
import { anthropic } from '../../../lib/anthropic'
import { prisma } from '../../../lib/prisma'
import { buildSystemPrompt } from '../../../lib/ai/systemPrompt'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { featureId, message, userId } = body as {
    featureId: string
    message: string
    userId: string
  }

  // Fetch feature with context
  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: {
      team: { include: { product: true } },
      specs: true,
      specMessages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!feature) {
    return new Response('Feature not found', { status: 404 })
  }

  // Save the user's message
  await prisma.specMessage.create({
    data: {
      featureId,
      userId,
      role: 'user',
      content: message,
    },
  })

  // Update status to SPECIFYING if not already
  if (feature.status === 'NOT_STARTED') {
    await prisma.feature.update({
      where: { id: featureId },
      data: { status: 'SPECIFYING' },
    })
  }

  // Build conversation history
  const existingSpec = feature.specs.length > 0 ? feature.specs[0].content : null
  const systemPrompt = buildSystemPrompt({
    featureTitle: feature.title,
    featureDescription: feature.description,
    featureIdentifier: feature.identifier,
    existingSpecContent: existingSpec,
    productName: feature.team.product.name,
    repoInfo: {
      owner: feature.team.product.owner,
      repoName: feature.team.product.repoName,
    },
  })

  const messages = feature.specMessages.map((m) => ({
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
            featureId,
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
