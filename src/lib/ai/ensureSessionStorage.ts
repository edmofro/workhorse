/**
 * Ensure the Claude Agent SDK stores sessions on the persistent volume.
 *
 * The SDK uses `CLAUDE_CONFIG_DIR` (falling back to `~/.claude/`) to decide
 * where session data lives. On Railway (or any ephemeral container host) the
 * home directory is wiped on each deploy, so we point it at a path under the
 * persistent volume instead.
 *
 * Import this module (side-effect only) before calling `query()` from the SDK.
 */
import { mkdirSync } from 'fs'

const REPOS_BASE = process.env.REPOS_BASE_PATH ?? '/data/repos'
const SESSION_DIR = process.env.CLAUDE_CONFIG_DIR ?? `${REPOS_BASE}/.claude`

if (!process.env.CLAUDE_CONFIG_DIR) {
  process.env.CLAUDE_CONFIG_DIR = SESSION_DIR
}

// Ensure the directory exists (no-op if it already does)
try {
  mkdirSync(SESSION_DIR, { recursive: true })
} catch {
  // Best-effort — the SDK will also attempt to create it
}
