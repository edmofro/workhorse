import { NextRequest, NextResponse } from 'next/server'
import { fetchRepoSpecTree } from '../../../lib/git/specTree'

export async function GET(request: NextRequest) {
  const owner = request.nextUrl.searchParams.get('owner')
  const repo = request.nextUrl.searchParams.get('repo')
  const branch = request.nextUrl.searchParams.get('branch') ?? 'main'

  if (!owner || !repo) {
    return new Response('Missing owner or repo', { status: 400 })
  }

  try {
    const result = await fetchRepoSpecTree(owner, repo, branch)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch specs'
    return new Response(message, { status: 500 })
  }
}
