---
title: Agent SDK interview architecture
area: interview
card: WH-001
status: draft
---

Replaces the current custom Claude API chat with the Claude Agent SDK, giving the AI interviewer full codebase access, automatic context window management, and the ability to write spec and mockup files directly to disk. Workhorse becomes an orchestration and approval UI rather than a chat engine.

## Why

The current interview system wraps the Anthropic Messages API with no tools, no codebase access, and naive full-history context management. Specs are embedded in chat messages as fenced code blocks and must be extracted. The AI can't read the target codebase at all, despite the system prompt telling it to "reference specific parts of the codebase when relevant."

The Claude Agent SDK gives us all of this for free: file tools (Read, Glob, Grep, Write, Edit), context window compaction, session persistence, and the full agentic loop. We should use it instead of reinventing it poorly.

## Architecture overview

```
User ↔ Workhorse UI ↔ /api/interview ↔ Claude Agent SDK session
                                            ↕
                                 Target repo worktree on disk
                                 (Read, Glob, Grep, Write, Edit)
                            ↕
                    DB stores: session ID, card linkage, file locks
```

The Agent SDK session runs against a git worktree of the target repo. The agent reads the codebase freely and writes spec/mockup files directly. Workhorse streams the agent's output to the UI.

### Deployment

Everything runs on Railway — a single deployment target with persistent disk for git clones, worktrees, and Agent SDK sessions. No split between web tier and worker tier for v1; the Next.js app and agent sessions run on the same box. Railway provides persistent disk and long-lived processes, which is what we need for stateful git operations.

The database is PostgreSQL on Railway (already configured in the Prisma schema). Railway's managed Postgres gives us backups, connection pooling, and persistence without managing infrastructure.

If agent sessions become a performance bottleneck (CPU/memory contention with web requests), the architecture supports splitting into a web service + worker service on Railway later. But start simple: one service, one disk.

### Source of truth: git branches, not worktrees

The git branch is the source of truth for all spec and mockup content. Worktrees are caches — disposable and recreatable from the branch at any time. Every change is auto-committed and pushed to the branch immediately (see "Auto-commit model" below). This means:

- A server redeploy or crash loses at most one agent turn (~30-60s of work)
- Worktrees can be recreated on startup from the branch
- No "uncommitted work" concept — everything is always saved to git
- `git log -- {filepath}` gives per-file version history for free

## Target repo access via git worktrees

Each product in Workhorse maps to a GitHub repo. The target repo must be available on disk for the agent's file tools to work. Git worktrees provide lightweight, isolated working directories that share a single object store.

### Repo storage layout

```
/data/repos/
  {owner}/{repo}/
    bare.git/                         ← bare mirror clone, shared objects
    worktrees/
      wh-042--{session-id-prefix}/    ← one worktree per active card
      wh-043--{session-id-prefix}/
```

### Lifecycle

- [ ] On product registration, create a bare mirror clone of the target repo
- [ ] Before each session starts, `git fetch` the bare clone to ensure freshness
- [ ] On first spec activity for a card (interview or manual edit), create a branch (`workhorse/{identifier}-spec`) and a worktree checked out at that branch
- [ ] All spec activity on the card (interview turns, manual edits) operates on the same worktree
- [ ] On commit, `git add` + `commit` + `push` from the worktree using the acting user's OAuth token
- [ ] On card close or timeout (no activity for 24h), remove the worktree via `git worktree remove`
- [ ] One worktree per card, not per user or per interview session

### Authentication

- [ ] Clone and fetch use a service-level token or the first user's OAuth token
- [ ] Push uses the acting user's GitHub OAuth token (already stored in the User model with `repo` scope)
- [ ] Commits are attributed to the pushing user
- [ ] No new auth infrastructure needed — the existing GitHub OAuth flow covers this

### Scaling

- [ ] Bare clone of a large repo: ~1-2 GB. Each worktree adds working tree size (~1-2 GB)
- [ ] 10 concurrent cards on the same repo: ~12-22 GB. Manageable on a single server
- [ ] For very large monorepos, use partial clone (`--filter=blob:none`) — git fetches blobs on demand
- [ ] Stale worktree cleanup: cron job removes worktrees with no activity for 24 hours

## Agent SDK integration

### Interview agent

- [ ] Use `query()` from `@anthropic-ai/claude-agent-sdk` to run interview sessions
- [ ] Grant tools: `Read`, `Glob`, `Grep`, `Write`, `Edit` — no `Bash` (agent cannot run arbitrary commands)
- [ ] Set `workingDirectory` to the card's worktree path
- [ ] Use `permissionMode: "acceptEdits"` — auto-approve file writes within the worktree
- [ ] Use system prompt preset `claude_code` with `append` for interview-specific instructions
- [ ] Enable `settingSources: ["project"]` so the agent picks up the target repo's `CLAUDE.md`
- [ ] Enable `includePartialMessages: true` for streaming to the UI
- [ ] Store the Agent SDK `session_id` on the Feature record for session resumption

### Interview instructions (appended to claude_code preset)

The append content replaces the current `systemPrompt.ts`. It tells the agent:

- Its role (spec interviewer for a specific card)
- Where to write specs (`.workhorse/specs/{area}/{slug}.md`) and mockups (`.workhorse/design/mockups/{card-id}/{slug}.html`)
- The spec file format (markdown with YAML frontmatter, checkbox criteria, blockquote open questions)
- Conversation style (concise, probing, 1-2 questions at a time, Australian/NZ English)
- Interview methodology (understand goal, probe details, surface decisions, track questions, extract criteria, signal completeness)
- To read existing specs and codebase proactively to inform questions
- To edit spec files in place rather than reproducing them in chat
- To acquire file locks before writing (see file locking section)

### Context window management

- [ ] The Agent SDK handles context window compaction automatically — no custom truncation or summarisation needed
- [ ] Long interviews that exceed the context window are compacted by the SDK, preserving the most relevant context
- [ ] This replaces the current naive full-history approach that would simply fail on long conversations

### Session persistence and resumption

- [ ] Agent SDK sessions persist to disk automatically (in `~/.claude/projects/`)
- [ ] Store `session_id` on the Feature record (replaces `SpecMessage` table)
- [ ] Resume sessions with `resume: sessionId` on subsequent turns
- [ ] Session transcript retrievable via `getSessionMessages()` if needed for audit/display
- [ ] No need to store individual messages in Workhorse's database

### Fresh-eyes review

- [ ] Remains a separate agent call with no conversation history (deliberately fresh context)
- [ ] Uses `persistSession: false` — ephemeral, no resumption needed
- [ ] Read-only tools only: `Read`, `Glob`, `Grep`
- [ ] Reviews spec files on disk in the worktree, not content extracted from chat

## Streaming and UI

### What the user sees during an agent turn

- [ ] Text responses stream in real-time (character by character)
- [ ] Tool calls are visible: "Reading `src/patient/search.ts`...", "Searching for `allergy`...", "Updated `specs/patient/allergies.md`"
- [ ] File write/edit events highlighted as notifications (e.g. "Updated specs/patient/allergies.md")
- [ ] Soft-lock on the spec editor during active turns ("Interviewer is working...")

### What the user does NOT see

Extended thinking is incompatible with streaming in the Agent SDK. With streaming enabled, the agent's internal reasoning is not visible. Tool results (file contents, search results) are not streamed inline — they appear in the next complete message.

Trade-off: streaming UX (seeing text arrive in real-time, seeing tool calls happen) is more valuable than seeing thinking steps. Users who want full detail can review the session transcript after the fact.

### API route

- [ ] `POST /api/interview` replaces `/api/chat`
- [ ] Streams Agent SDK events to the client via Server-Sent Events (SSE)
- [ ] Captures `session_id` on init, stores on Feature record
- [ ] Frontend `useInterview` hook (replaces `useChat`) consumes SSE and updates UI state

## Spec and mockup files

### Specs written directly to disk

The agent writes spec files in the standard format to `.workhorse/specs/` within the worktree. No extraction from chat messages. The spec tab reads files from the worktree via `fs.readFile()`.

- [ ] Agent creates new spec files at paths it determines based on codebase structure
- [ ] Agent edits existing spec files in place when refining criteria
- [ ] Spec tab lists files from `git diff --name-only main` filtered to `.workhorse/specs/`
- [ ] New vs existing detection: file doesn't exist on `main` branch = new
- [ ] Dirty detection: `git status` or `git diff` in the worktree
- [ ] Current content: read from disk. Committed content: `git show HEAD:{path}`

### Mockups written directly to disk

The agent writes mockup HTML files to `.workhorse/design/mockups/{card-id}/` within the worktree.

- [ ] Each mockup is a standalone HTML file with inline CSS
- [ ] Mockup files include an HTML comment header referencing their spec: `<!-- spec: patient/allergies.md -->`
- [ ] Mockup viewer reads files from disk (same as spec tab)
- [ ] Agent can revise mockups when asked — just edits the file
- [ ] On commit, mockups are committed alongside specs

### No more FeatureSpec model

The `FeatureSpec` table is no longer needed. The worktree + git branch is the source of truth:

- `filePath` → `git diff --name-only main` on the card's branch
- `isNew` → file doesn't exist on `main`
- `content` → `fs.readFile()` in the worktree
- `committedContent` → `git show HEAD:{path}`
- Dirty detection → `git diff`

If a lightweight cache of touched files is needed (e.g. for listing cards that touch a given spec), add a `touchedFiles` JSON field on Feature, updated on each worktree change.

### No more SpecMessage model

The `SpecMessage` table is no longer needed. Conversation history lives in the Agent SDK's session storage on disk, resumable by session ID. If conversation display is needed in the UI, use `getSessionMessages()` from the SDK.

## File locking

Each spec and mockup file has at most one active editor (user or AI) at a time.

### Lock model

A `FileLock` record tracks who is editing each file:

- `featureId` + `filePath` (unique constraint)
- `lockedBy`: user ID or `"ai-interviewer"`
- `lockedAt`: timestamp
- `expiresAt`: auto-expire stale locks (10 minutes for humans, 2 minutes for AI)

### Lock behaviour

- [ ] User clicks "Edit" on a spec file → acquire lock. If already locked, show "Being edited by {name}" in view-only mode
- [ ] Agent needs to write a file → acquire lock. If locked by a user, the agent describes its intended changes in chat instead of writing the file
- [ ] Lock released when: user clicks "Done editing", user navigates away, agent turn completes, or lock expires
- [ ] Stale lock cleanup: on-access check against `expiresAt`, plus periodic sweep
- [ ] Lock status visible in the spec tab file list (unlocked / locked by {name} / locked by AI)

## Auto-commit model

Every change to spec and mockup files is committed and pushed to the card's branch automatically. The branch is always up to date — there is no "uncommitted work."

### Agent turns

- [ ] At the end of each agent turn, auto-commit all changed files and push to the branch
- [ ] The agent generates a descriptive commit message summarising what it did (e.g. "initial draft with 5 acceptance criteria for allergies", "added edge case for expired allergies")
- [ ] If the server dies mid-turn, at most one turn's work is lost. The agent session can be restarted and asked to redo its last step
- [ ] Commit is attributed to the card's assignee (or the user who started the interview), with a trailer indicating the AI authored the content

### User edits

- [ ] When a user finishes editing a spec file (leaves edit mode / clicks "Done editing"), auto-commit and push
- [ ] The UI prompts for a brief description of the change, pre-filled by the AI (e.g. "added edge case for expired allergies"). User can accept, edit, or skip
- [ ] No commit on every keystroke — only when the user transitions from edit mode to view mode
- [ ] This avoids excessive version noise while still capturing every meaningful save point

### Commit messages

Commit messages are AI-generated and descriptive, not mechanical. They describe **what changed and why**, because these messages power the per-file version history UI:

```
allergies.md history:
  3 min ago    Felix — added edge case for expired allergies
  12 min ago   Interviewer — initial draft with 5 criteria
  15 min ago   Interviewer — created file
```

The version history displays the commit message as the description, the author, and the relative timestamp. Users never see SHAs or branch names — just a clean edit history per file.

### What "Commit" becomes

There is no longer a prominent "Commit" button in the current sense (save work to git). Work is always saved. Instead:

- [ ] A "Mark ready" action in the card status area transitions the card from `SPECIFYING` → `IMPLEMENTING`
- [ ] This is a status transition, not a git operation — specs are already committed
- [ ] No PR is created at this point. The implementation phase handles PRs when the developer is ready
- [ ] The AI pushes back if areas remain uncovered (existing behaviour from the "marks spec complete" flow)
- [ ] The action is not a prominent CTA — it's a status dropdown or a secondary action, since the normal flow is to keep iterating until the spec is solid

### Per-file version history

Since every change is committed with a descriptive message, `git log -- {filepath}` gives a full edit history per file:

- [ ] Spec tab shows a "History" affordance per file
- [ ] Each version shows: relative timestamp, author (user name or "Interviewer"), and the commit message as a description
- [ ] Clicking a version shows the file content at that point (`git show {sha}:{path}`)
- [ ] Diff between versions available via `git diff {sha1} {sha2} -- {path}`

## Worktree recovery

If the server restarts (redeploy, crash, Railway restart), worktrees are recreated from branches:

- [ ] On startup, query the DB for all cards with status `SPECIFYING` or `IMPLEMENTING`
- [ ] For each, check if the expected worktree exists on disk
- [ ] If missing, recreate: `git fetch` the card's branch, then `git worktree add` from it
- [ ] Agent SDK sessions are lost on crash (they're in-memory/on-disk), but the conversation can be restarted — the agent re-reads the spec files from the branch and picks up where it left off
- [ ] The only loss window: changes made after the last auto-commit but before the crash. For agent turns, at most one turn (~30-60s). For user edits, zero (user must leave edit mode to trigger commit, at which point changes are saved)

### Stale worktree cleanup

- [ ] Cron job removes worktrees with no activity for 24 hours (existing requirement)
- [ ] Worktrees for cards in `COMPLETE` status can be removed immediately
- [ ] Recovery re-creates them on demand if needed

## Naming cleanup

Several names in the current codebase use "spec" where "card" is more accurate. Rename as part of this work:

### Renames

- `Feature.specBranch` → `Feature.cardBranch`
- `Feature.status: 'SPEC_COMPLETE'` → `'IMPLEMENTING'`
- `/api/chat` route → `/api/interview`
- `useChat` hook → `useInterview`
- `ChatView` component → `InterviewView` (or keep as-is — "chat" is also reasonable)
- `.spec-extract-block`, `.spec-extract-label` CSS classes → remove (extraction no longer happens)

### Drops

- `SpecMessage` model → replaced by Agent SDK sessions
- `FeatureSpec` model → replaced by worktree filesystem
- `src/lib/actions/messages.ts` → no longer needed
- `src/lib/ai/systemPrompt.ts` → replaced by interview instructions appended to SDK preset
- Spec extraction logic in `MarkdownContent.tsx` → no longer needed

### Keeps (correct usage)

- `SpecEditor`, `SpecTab`, `SpecListSidebar`, `SpecDocument`, `SpecExplorer`, `SpecTree` — these refer to the spec document, which is correct
- `src/lib/specs/`, `src/lib/git/commitSpecs.ts`, `src/lib/git/specTree.ts` — utilities for spec files, correct
- `Feature.status: 'SPECIFYING'` — the card is specifying, accurate
- `spec_updated` activity type — a spec was updated, correct

### New additions

- `Feature.agentSessionId` — stores the Agent SDK session ID for resumption
- `Feature.touchedFiles` (optional) — JSON array of file paths this card has modified
- `FileLock` model — file-level edit locking

## Card statuses

The card status model extends to cover implementation, not just specifying:

- `NOT_STARTED` — card created, no spec activity yet
- `SPECIFYING` — interview or manual spec editing in progress
- `IMPLEMENTING` — specs committed, implementation in progress
- `COMPLETE` — implementation done (PR merged, or manually marked)

The existing `SPEC_COMPLETE` status is replaced by `IMPLEMENTING`, which better reflects what happens next: the card moves from specifying into implementation. "Spec complete" was a milestone, not a status — the real status is that implementation has begun.

- [ ] Rename `SPEC_COMPLETE` to `IMPLEMENTING` throughout the codebase
- [ ] Add `COMPLETE` status for fully finished cards
- [ ] Status transitions: `NOT_STARTED` → `SPECIFYING` → `IMPLEMENTING` → `COMPLETE`
- [ ] Backward transition allowed (e.g. `IMPLEMENTING` → `SPECIFYING` if specs need rework)

## Collaborate with agent button

A split dropdown button appears in both `SPECIFYING` and `IMPLEMENTING` modes, adapting its prompt to the current phase. This is the same split button pattern already used for implementation handoff (like GitHub's merge strategy button on PR reviews), extended to cover spec collaboration too.

### UX

- [ ] Split button with dropdown: primary action on the face, chevron opens dropdown with both options
- [ ] Two options: "Copy prompt" and "Launch Claude Code"
- [ ] "Copy prompt" copies the phase-appropriate prompt to clipboard
- [ ] "Launch Claude Code" copies prompt to clipboard AND opens `claude.ai/code` in a new tab
- [ ] Button face shows whichever option the user chose last time (persisted in localStorage)
- [ ] Default for first-time users: "Launch Claude Code"
- [ ] Toast confirms: "Prompt copied" or "Prompt copied — opening Claude Code"

### Specifying mode prompt

When the card status is `SPECIFYING`, the prompt tells the agent to collaborate on specs:

```
git fetch origin workhorse/wh-042-spec
git checkout workhorse/wh-042-spec

Specs in progress:
- .workhorse/specs/patient/merge-patients.md (new)
- .workhorse/specs/patient/patient-search.md (updated)

Mockups:
- .workhorse/design/mockups/wh-042/merge-flow.html

Review the current specs and the codebase, then help develop
the acceptance criteria. Edit the spec files directly.
```

- [ ] Prompt includes git fetch/checkout for the card branch
- [ ] Lists spec files this card touches, with new/updated labels
- [ ] Lists mockup file paths
- [ ] Instructs the agent to read specs and codebase, then edit spec files directly
- [ ] Under 500 characters for typical features

### Implementing mode prompt

When the card status is `IMPLEMENTING`, the prompt tells the agent to implement:

```
git fetch origin workhorse/wh-042-spec
git checkout workhorse/wh-042-spec

New specs:
- .workhorse/specs/patient/merge-patients.md
- .workhorse/specs/patient/merge-conflicts.md

Updated specs:
- .workhorse/specs/patient/patient-search.md

Mockups:
- .workhorse/design/mockups/wh-042/merge-flow.html

Review the diff to see what changed:
git diff main...workhorse/wh-042-spec -- .workhorse/

Read the specs and mockups, then implement all acceptance criteria.
```

- [ ] Same structure as the specifying prompt but with implementation instruction
- [ ] Includes git diff command to see the spec delta from main
- [ ] Under 500 characters for typical features

### Button placement

- [ ] Appears in the topbar right section
- [ ] In `SPECIFYING` mode: Collaborate button visible (no Commit button — auto-commits handle saving)
- [ ] In `IMPLEMENTING` mode: Collaborate button visible
- [ ] Button label adapts: could show "Collaborate on specs" vs "Implement" — or just always show "Launch Claude Code" / "Copy prompt" since the prompt itself carries the context

## External agent collaboration

The worktree-on-disk architecture means that any agent with access to the same worktree can participate — not just the built-in interviewer. The collaborate button described above is the primary entry point, but the architecture is open by design.

### How it works

- [ ] The external Claude Code session operates on the same branch as the card
- [ ] It reads/writes the same spec and mockup files the built-in interviewer does
- [ ] On return to Workhorse, the UI reflects any changes (it reads from disk)
- [ ] File locking applies — the external session should acquire locks, or if that's impractical, Workhorse detects changed files on focus and refreshes

### Implementation from within Workhorse

- [ ] The same Agent SDK infrastructure can run an implementation agent, not just an interviewer
- [ ] The agent reads specs from `.workhorse/specs/`, diffs against main, and implements
- [ ] This is a future capability but the architecture supports it with no changes — just a different system prompt appended to the same SDK setup
- [ ] When ready, could replace the "Launch Claude Code" external flow with an in-app implementation experience

## Open questions

> **Worktree disk pressure:** For very large monorepos, even with partial clone, working tree checkout could be slow or large. Should we support sparse checkout (only materialise relevant directories)? Probably premature — try full checkout first.

> **Concurrent interviews on the same card:** Current design is one Agent SDK session per card. If two users want to interview simultaneously, they'd need to take turns or the session would need to be shared. Is this acceptable for v1?

> **Session transcript display:** Should the UI show the full Agent SDK session transcript (including tool calls), or just the text messages? The full transcript is richer but noisier. Could offer a toggle.

> **Branch strategy for dependencies:** If card WH-043 depends on WH-042, should WH-043's worktree branch from WH-042's branch? This would let the agent see WH-042's spec changes. Adds complexity to branch management.

> **Offline/degraded mode:** If the bare clone fetch fails (network issues), should we proceed with a stale worktree? Probably yes — stale code is better than no code.

> **External agent auto-commit sync:** When an external Claude Code session pushes commits to the card's branch, Workhorse needs to detect these on focus/return. Should we poll the branch, use a webhook, or just `git pull` when the user returns to the card?

> **Railway scaling:** A single Railway service handles both web requests and agent sessions. At what concurrency level does this become a problem? Should we have a concrete plan for splitting into web + worker services, or just monitor and react?
