import { NextRequest } from 'next/server'
import { anthropic } from '../../../lib/anthropic'
import { prisma } from '../../../lib/prisma'
import { buildReviewPrompt } from '../../../lib/ai/freshEyesReview'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { featureId } = body as { featureId: string }

  const feature = await prisma.feature.findUnique({
    where: { id: featureId },
    include: { specs: true },
  })

  if (!feature) {
    return new Response('Feature not found', { status: 404 })
  }

  const specContent = feature.specs.map((s) => s.content).join('\n\n---\n\n')

  if (!specContent.trim()) {
    return new Response('No spec content to review', { status: 400 })
  }

  const reviewPrompt = buildReviewPrompt(specContent, feature.title)

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: reviewPrompt }],
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

        // Save review as a system message
        await prisma.specMessage.create({
          data: {
            featureId,
            role: 'system',
            content: fullResponse,
            metadata: JSON.stringify({ type: 'fresh-eyes-review' }),
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
