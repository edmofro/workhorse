import { NextRequest } from 'next/server'

/**
 * Legacy chat endpoint — redirects to /api/interview.
 * The chat API has been replaced by the Agent SDK interview endpoint.
 */
export async function POST(request: NextRequest) {
  // Forward to the new interview endpoint
  const url = new URL('/api/interview', request.url)
  return Response.redirect(url, 307)
}
