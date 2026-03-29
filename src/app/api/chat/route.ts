import { NextRequest } from 'next/server'

/**
 * Legacy chat endpoint — redirects to /api/agent-session.
 */
export async function POST(request: NextRequest) {
  const url = new URL('/api/agent-session', request.url)
  return Response.redirect(url, 307)
}
