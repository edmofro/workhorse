import { NextResponse } from 'next/server'
import { clearSession } from '../../../../lib/auth/session'

/**
 * POST /api/auth/sign-out
 * Clears the session cookie and redirects to sign-in.
 */
export async function POST() {
  await clearSession()
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  return NextResponse.redirect(`${baseUrl}/sign-in`, { status: 303 })
}
