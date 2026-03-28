import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth/session'
import { prisma } from '../../../lib/prisma'
import {
  getChangedFiles,
  readWorktreeFile,
  writeWorktreeFile,
} from '../../../lib/git/worktree'

/**
 * Read/write files in a card's worktree.
 * GET: Read a file or list changed files.
 * PUT: Write a file.
 */
export async function GET(request: NextRequest) {
  await requireUser()

  const cardId = request.nextUrl.searchParams.get('cardId')
  const filePath = request.nextUrl.searchParams.get('filePath')

  if (!cardId) {
    return new Response('Missing cardId', { status: 400 })
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      team: { include: { project: true } },
    },
  })

  if (!card) {
    return new Response('Card not found', { status: 404 })
  }

  const { owner, repoName, defaultBranch } = card.team.project

  // Read a specific file
  if (filePath) {
    const content = await readWorktreeFile(owner, repoName, card.identifier, filePath)
    if (content === null) {
      return new Response('File not found', { status: 404 })
    }
    return NextResponse.json({ content })
  }

  // List changed files
  const files = await getChangedFiles(owner, repoName, card.identifier, defaultBranch)
  return NextResponse.json({ files })
}

export async function PUT(request: NextRequest) {
  await requireUser()

  const body = await request.json()
  const { cardId, filePath, content } = body as {
    cardId: string
    filePath: string
    content: string
  }

  if (!cardId || !filePath || content === undefined) {
    return new Response('Missing cardId, filePath, or content', { status: 400 })
  }

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

  await writeWorktreeFile(owner, repoName, card.identifier, filePath, content)

  return NextResponse.json({ ok: true })
}
