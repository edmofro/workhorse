import { NextRequest, NextResponse } from 'next/server'
import { fetchDesignLibrary } from '../../../lib/git/designLibrary'

export async function GET(request: NextRequest) {
  const owner = request.nextUrl.searchParams.get('owner')
  const repo = request.nextUrl.searchParams.get('repo')
  const branch = request.nextUrl.searchParams.get('branch') ?? 'main'

  if (!owner || !repo) {
    return new Response('Missing owner or repo', { status: 400 })
  }

  try {
    const files = await fetchDesignLibrary(owner, repo, branch)
    return NextResponse.json(files)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch design library'
    return new Response(message, { status: 500 })
  }
}
