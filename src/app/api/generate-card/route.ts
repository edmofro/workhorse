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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      system: `You process card creation input for a spec-driven development workbench.

Given the user's input, respond with JSON only — no markdown fences, no extra text. If the user has attached images (screenshots, mockups, etc.), use them as context.

Format:
{"title": "...", "description": "..."}

Rules:
- Title: A short phrase of 5–8 words summarising the intent. Sentence case. No full stop.
- Description: The user's input with light formatting only — add line breaks where natural paragraph breaks would improve readability, apply sentence case at the start of sentences. Do not change any wording, add or remove content, or rewrite anything.
- Use Australian/NZ English spelling in the title only (the description preserves the user's own words).`,
    })

    const text =
      message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(text) as { title: string; description: string }

    return NextResponse.json({
      title: parsed.title ?? '',
      description: parsed.description ?? '',
    })
  } catch {
    return NextResponse.json({ title: '', description: prompt.trim() })
  }
}
