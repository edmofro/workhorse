# Implementation handoff: Agent SDK interview architecture

## Getting started

```bash
git fetch origin main
git checkout -b implement/agent-sdk-interview origin/main
```

To see what changed in the specs:

```bash
git diff 428572c..main -- .workhorse/specs/
```

To see just the new spec (the bulk of the work):

```bash
cat .workhorse/specs/interview/agent-sdk-interview.md
```

## Summary of changes

### 1. Agent SDK replaces custom chat API

The AI interviewer now runs on the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) instead of direct Anthropic Messages API calls. The agent has full file tools (Read, Glob, Grep, Write, Edit) scoped to a git worktree of the target repo. It reads the codebase, writes spec and mockup files directly to disk, and manages its own context window. Workhorse becomes an orchestration UI that streams the agent's output — it no longer constructs messages, manages history, or extracts specs from chat.

### 2. Git worktrees for target repo access

Each card gets a git worktree checked out from a bare mirror clone of the target repo. The worktree is the agent's working directory. A repo storage layout under `/data/repos/{owner}/{repo}/` holds the bare clone and per-card worktrees. Worktrees are created on first spec activity for a card, shared across all activity on that card, and cleaned up after 24h of inactivity.

### 3. Auto-commit model

Every change to spec and mockup files is auto-committed and pushed to the card's git branch. Agent turns commit at the end of each turn with an AI-generated descriptive message. User edits commit when the user leaves edit mode. The git branch is the source of truth — worktrees are disposable caches. There is no manual "save" or "commit" action.

### 4. Per-file version history

Since every change has a descriptive commit message, each spec file has a navigable edit history powered by `git log -- {filepath}`. The UI shows relative timestamps, authors, and change descriptions. Users can view any version or diff between versions.

### 5. "Mark ready" replaces "Commit" button

The prominent "Commit" button is gone. Work is always saved to git. Instead, a secondary "Mark ready" action transitions the card from `SPECIFYING` → `IMPLEMENTING`. No PR is created at this point — the implementation phase handles that.

### 6. Deployment on Railway

Single Railway service with persistent disk. PostgreSQL on Railway for the database (already in the Prisma schema). No web/worker split for v1.

### 7. File locking

Each spec and mockup file has at most one editor (user or AI) at a time. A `FileLock` model tracks who holds the lock, with auto-expiry (10 min for humans, 2 min for AI).

### 8. Card statuses and collaborate button

Card statuses are `NOT_STARTED` → `SPECIFYING` → `IMPLEMENTING` → `COMPLETE`. A split dropdown "Collaborate" button appears in both specifying and implementing modes, generating a phase-appropriate prompt for external Claude Code sessions.

### 9. Worktree recovery

On server restart, worktrees are recreated from branches for all active cards. Agent SDK sessions are lost but can be restarted — the specs on the branch are safe.

## Files changed

### New

- `.workhorse/specs/interview/agent-sdk-interview.md` — the main spec. Covers architecture, worktrees, Agent SDK integration, streaming, file locking, auto-commit, recovery, naming, statuses, collaborate button, and external agent collaboration.

### Modified

- `.workhorse/specs/overview.md` — deployment decision (Railway + PostgreSQL), auto-commit in the v1 flow, git mechanics invisible.
- `.workhorse/specs/workflow/commit-specs.md` — rewritten around auto-commit model, per-file version history, "mark ready" quality gate. Collaborate button details moved to the agent SDK spec.

## Instructions

1. Read all three spec files listed above. They describe the target state of the system.
2. Run the diff command to see exactly what changed from the previous spec versions:
   ```bash
   git diff 428572c..main -- .workhorse/specs/
   ```
3. The specs describe the system as it should be. The diff tells you what needs to change. Implement all acceptance criteria (checkbox items) in the specs.
4. Read the existing codebase — particularly the Prisma schema (`prisma/schema.prisma`), the current chat API route (`src/app/api/chat/`), the commit flow (`src/lib/git/commitSpecs.ts`), and the feature components (`src/components/feature/`) — to understand what exists today.

## Key implementation areas

1. **Bare clone and worktree management** — Create the `/data/repos/` storage layout. Implement bare mirror cloning on product registration, `git fetch` before sessions, worktree creation/removal lifecycle, and stale worktree cleanup (24h cron).

2. **Agent SDK interview integration** — Replace the `/api/chat` route with `/api/interview` using `query()` from `@anthropic-ai/claude-agent-sdk`. Configure tools (Read, Glob, Grep, Write, Edit — no Bash), `workingDirectory`, `permissionMode: "acceptEdits"`, system prompt preset with appended interview instructions. Stream events to the client via SSE.

3. **Frontend interview hook** — Replace `useChat` with `useInterview`. Consume SSE from `/api/interview`. Display streaming text, tool call indicators, and file write notifications. Soft-lock the spec editor during agent turns.

4. **Session persistence** — Store `session_id` on the Feature record. Resume sessions with `resume: sessionId`. Add `Feature.agentSessionId` to the Prisma schema.

5. **Auto-commit pipeline** — After each agent turn and on user edit-mode exit, run `git add` + `git commit` + `git push` in the worktree. Agent turns get AI-generated commit messages. User edits prompt for a description (AI pre-filled). Push using the acting user's OAuth token.

6. **Per-file version history UI** — Add a "History" affordance per file in the spec tab. Query `git log -- {filepath}` for entries. Display relative timestamp, author, and commit message. Support viewing file at any version (`git show {sha}:{path}`) and diffing between versions.

7. **File locking** — Add `FileLock` model to Prisma schema. Implement lock acquisition on user edit and agent write, lock release on done/navigate-away/turn-complete/expiry, and lock status display in the spec tab.

8. **"Mark ready" status transition** — Replace the "Commit" button with a "Mark ready" secondary action. Implement `SPECIFYING` → `IMPLEMENTING` transition with AI pushback if areas remain uncovered. Add `IMPLEMENTING` and `COMPLETE` statuses to the schema (replacing `SPEC_COMPLETE`).

9. **Card status model** — Update the Feature status enum: `NOT_STARTED`, `SPECIFYING`, `IMPLEMENTING`, `COMPLETE`. Support backward transitions.

10. **Collaborate button** — Split dropdown button in the topbar. Two options: "Copy prompt" and "Launch Claude Code". Generate phase-appropriate prompts (specifying vs implementing). Persist last-used option in localStorage.

11. **Worktree recovery on startup** — On server start, query DB for active cards, check for missing worktrees, recreate from branches via `git fetch` + `git worktree add`.

12. **Data model cleanup** — Remove `FeatureSpec` and `SpecMessage` models from Prisma. Remove associated server actions and API routes. Add `Feature.agentSessionId`, `Feature.cardBranch` (rename from `specBranch`), and `Feature.touchedFiles`. Add `FileLock` model.

13. **Naming alignment** — Rename `Feature.specBranch` → `cardBranch`, `/api/chat` → `/api/interview`, `useChat` → `useInterview`, `ChatView` → `InterviewView`. Remove spec extraction CSS classes and logic.

14. **Fresh-eyes review** — Implement as a separate ephemeral agent call (`persistSession: false`) with read-only tools. Reviews spec files on disk in the worktree with no conversation history.
