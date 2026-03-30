/**
 * Migration script: Move Card.agentSessionId to ConversationSession records.
 *
 * Run after applying the schema changes with `prisma db push`.
 * This script creates a ConversationSession for each card that had an agentSessionId.
 *
 * Usage: npx tsx scripts/migrate-agent-sessions.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  // Find all cards that previously had agent sessions
  // After schema change, the agentSessionId column no longer exists on Card,
  // so we query via raw SQL to get the old values if the column still exists.
  // If the column has already been dropped, this script is a no-op.

  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; agentSessionId: string; teamId: string }>>`
      SELECT id, "agentSessionId", "teamId"
      FROM "Card"
      WHERE "agentSessionId" IS NOT NULL
    `

    if (rows.length === 0) {
      console.log('No cards with agentSessionId found. Nothing to migrate.')
      return
    }

    console.log(`Found ${rows.length} cards with agent sessions to migrate.`)

    for (const row of rows) {
      // Check if a session already exists for this card (idempotent)
      const existing = await prisma.conversationSession.findFirst({
        where: { cardId: row.id, agentSessionId: row.agentSessionId },
      })

      if (existing) {
        console.log(`  Skipping card ${row.id} — session already exists`)
        continue
      }

      // Get the card's assignee or first user as the session owner
      const card = await prisma.card.findUnique({
        where: { id: row.id },
        select: { assigneeId: true, identifier: true },
      })

      // Fall back to the first user if no assignee
      const userId = card?.assigneeId ?? (await prisma.user.findFirst())?.id
      if (!userId) {
        console.log(`  Skipping card ${row.id} — no user found`)
        continue
      }

      await prisma.conversationSession.create({
        data: {
          cardId: row.id,
          teamId: row.teamId,
          userId,
          agentSessionId: row.agentSessionId,
          title: 'Previous conversation',
          messageCount: 1, // Approximate — we don't know the exact count
          lastMessageAt: new Date(),
        },
      })

      console.log(`  Migrated card ${card?.identifier ?? row.id}`)
    }

    console.log('Migration complete.')
  } catch (err) {
    // If the column doesn't exist, the raw query will fail — that's fine
    if (err instanceof Error && err.message.includes('agentSessionId')) {
      console.log('agentSessionId column not found on Card — schema already migrated. Nothing to do.')
    } else {
      throw err
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
