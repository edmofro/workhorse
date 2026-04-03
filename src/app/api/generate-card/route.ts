import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { anthropic } from '../../../lib/anthropic'
import { requireUser } from '../../../lib/auth/session'
import { prisma } from '../../../lib/prisma'
import type Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  await requireUser()

  const { prompt, attachmentIds } = (await request.json()) as {
    prompt: string
    attachmentIds?: string[]
  }

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }

  try {
    // Build content blocks
    const content: Anthropic.ContentBlockParam[] = []

    // Add image attachments if any (cap at 5 to limit payload size)
    if (attachmentIds && attachmentIds.length > 0) {
      const attachments = await prisma.attachment.findMany({
        where: { id: { in: attachmentIds.slice(0, 5) } },
      })

      const imageAtts = attachments.filter(
        (a) => a.mimeType.startsWith('image/') && a.mimeType !== 'image/svg+xml',
      )

      // Load images concurrently to reduce latency
      const imageBlocks = await Promise.all(
        imageAtts.map(async (att) => {
          try {
            const data = await readFile(att.storagePath)
            return {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: att.mimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
                data: data.toString('base64'),
              },
            }
          } catch {
            return null
          }
        }),
      )

      for (const block of imageBlocks) {
        if (block) content.push(block)
      }
    }

    content.push({ type: 'text', text: prompt.trim() })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      system: `You generate a card description for a spec-driven development workbench.

Given the user's description of what they want to achieve, respond with JSON only — no markdown fences, no extra text. If the user has attached images (screenshots, mockups, etc.), use them as context to understand what they want.

Format:
{"description": "..."}

Rules:
- Description: 1–3 sentences summarising the intent. Written as what the system does, not instructions. Use Australian/NZ English spelling.
- Do not include acceptance criteria, technical details, or implementation notes.
- If images are provided, reference what they show when relevant to the description.`,
    })

    const text =
      message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(text) as { description: string }

    return NextResponse.json({
      description: parsed.description ?? '',
    })
  } catch {
    return NextResponse.json({ description: prompt.trim() })
  }
}
