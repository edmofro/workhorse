import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '../../../lib/anthropic'
import { requireUser } from '../../../lib/auth/session'

export async function POST(request: NextRequest) {
  await requireUser()

  const { prompt } = (await request.json()) as { prompt: string }

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: prompt.trim(),
        },
      ],
      system: `You generate a card title and description for a spec-driven development workbench.

Given the user's description of what they want to achieve, respond with JSON only — no markdown fences, no extra text.

Format:
{"title": "...", "description": "..."}

Rules:
- Title: concise noun phrase, under 60 characters. Not a command — "Patient allergy tracking" not "Add patient allergy tracking".
- Description: 1–3 sentences summarising the intent. Written as what the system does, not instructions. Use Australian/NZ English spelling.
- Do not include acceptance criteria, technical details, or implementation notes.`,
    })

    const text =
      message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(text) as { title: string; description: string }

    if (!parsed.title) {
      throw new Error('No title in response')
    }

    return NextResponse.json({
      title: parsed.title,
      description: parsed.description ?? '',
    })
  } catch {
    // Fallback: use the raw prompt
    const title =
      prompt.trim().length > 60
        ? prompt.trim().slice(0, 57) + '...'
        : prompt.trim()

    return NextResponse.json({ title, description: prompt.trim() })
  }
}
