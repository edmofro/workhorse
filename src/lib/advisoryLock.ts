/**
 * Postgres session-level advisory locks for agent session crash detection.
 *
 * Each active agent session holds a lock keyed to the conversation session ID.
 * If the process dies, the pg connection drops and the lock is released
 * automatically, allowing orphan detection on startup.
 *
 * Uses a dedicated pg connection per lock (not Prisma's pool) so the lock
 * lifetime is tied to the connection lifetime.
 *
 * Lock keys use the two-key form `pg_advisory_lock(key1, key2)` with two
 * independent 32-bit hashes to provide a 64-bit keyspace, avoiding the
 * collision risk of a single hashtext() call.
 */

import pg from 'pg'

interface LockHandle {
  client: pg.Client
  lockKey: string
}

/** Map of session ID → lock handle for explicit release. */
const activeLocks = new Map<string, LockHandle>()

/**
 * Two-key advisory lock SQL fragments.
 * Uses hashtext on two different inputs (the raw ID and a salted variant)
 * to produce two independent 32-bit keys, giving an effective 64-bit keyspace.
 */
const LOCK_TRY = `SELECT pg_try_advisory_lock(hashtext($1), hashtext('workhorse:' || $1)) AS acquired`
const LOCK_RELEASE = `SELECT pg_advisory_unlock(hashtext($1), hashtext('workhorse:' || $1))`

/**
 * Acquire a session-level advisory lock for a conversation session.
 * Returns true if the lock was acquired, false if it's already held.
 */
export async function acquireAdvisoryLock(sessionId: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false
  if (activeLocks.has(sessionId)) return true // Already held by us

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()
    const result = await client.query(LOCK_TRY, [sessionId])
    const acquired = result.rows[0]?.acquired === true
    if (acquired) {
      activeLocks.set(sessionId, { client, lockKey: sessionId })
    } else {
      await client.end()
    }
    return acquired
  } catch (err) {
    console.error('[advisoryLock] Failed to acquire lock:', err)
    await client.end().catch(() => {})
    return false
  }
}

/**
 * Release an advisory lock explicitly.
 * Called on normal completion; on crash the connection drop handles it.
 */
export async function releaseAdvisoryLock(sessionId: string): Promise<void> {
  const handle = activeLocks.get(sessionId)
  if (!handle) return

  activeLocks.delete(sessionId)
  try {
    await handle.client.query(LOCK_RELEASE, [sessionId])
  } catch {
    // Lock will be released when connection drops
  } finally {
    await handle.client.end().catch(() => {})
  }
}

/**
 * Test whether a session's advisory lock is currently held.
 * Returns true if the lock is NOT held (orphaned session).
 * Acquires and immediately releases to test — does not hold.
 */
export async function isLockOrphaned(sessionId: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()
    const result = await client.query(LOCK_TRY, [sessionId])
    const acquired = result.rows[0]?.acquired === true
    if (acquired) {
      // Nobody held it — release immediately and report orphaned
      await client.query(LOCK_RELEASE, [sessionId])
    }
    return acquired
  } catch {
    return false
  } finally {
    await client.end().catch(() => {})
  }
}
