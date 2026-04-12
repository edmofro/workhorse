---
title: Agent SDK session architecture
area: agent
card: WH-001
---

The AI agent runs on the Claude Agent SDK, giving it full codebase access, automatic context window management, and the ability to write spec and mockup files directly to disk. Workhorse is an orchestration and approval UI — the Agent SDK handles the agentic loop, file tools (Read, Glob, Grep, Write, Edit), context window compaction, and session persistence.

## Architecture overview

```
User ↔ Workhorse UI ←SSE← /api/sessions/[id]/events ← pub/sub channel
                                                          ↑
         /api/agent-session → Claude Agent SDK session → publishes events
                                       ↕
                            Target repo worktree on disk
                            (Read, Glob, Grep, Write, Edit)
                                       ↕
                    DB stores: session ID, card linkage, agentActiveAt
                                       ↓
                    pg_notify → sidebar SSE, session SSE
```

The Agent SDK session runs against a git worktree of the target repo. The agent reads the codebase freely and writes spec/mockup files directly. SDK events are published to an in-memory pub/sub channel; clients always subscribe via SSE rather than reading the agent-session response directly. Database changes trigger Postgres notifications for sidebar and activity state updates.

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
- [ ] On first spec activity for a card (agent session or manual edit), create a branch (`workhorse/{identifier}-spec`) and a worktree checked out at that branch
- [ ] All spec activity on the card (agent turns, manual edits) operates on the same worktree
- [ ] On commit, `git add` + `commit` + `push` from the worktree using the acting user's OAuth token
- [ ] On card close or timeout (no activity for 24h), remove the worktree via `git worktree remove`
- [ ] One worktree per card, not per user or per session

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

### Agent configuration

- [ ] Use `query()` from `@anthropic-ai/claude-agent-sdk` to run agent sessions
- [ ] Grant tools: `Read`, `Glob`, `Grep`, `Write`, `Edit` — no `Bash` (agent cannot run arbitrary commands)
- [ ] Set `workingDirectory` to the card's worktree path
- [ ] Use `permissionMode: "acceptEdits"` — auto-approve file writes within the worktree
- [ ] Use system prompt preset `claude_code` with `append` for session-specific instructions
- [ ] Enable `settingSources: ["project"]` so the agent picks up the target repo's `CLAUDE.md`
- [ ] Enable `includePartialMessages: true` for streaming to the UI
- [ ] Store the Agent SDK `session_id` on the Feature record for session resumption

### Session instructions (appended to claude_code preset)

The appended instructions have three layers, all injected server-side so the agent starts every session with full context:

**1. Workhorse domain context** (`workhorseContext.ts`) — rich, static knowledge about how Workhorse works:

- What Workhorse is and its key concepts (project, team, card, spec, mockup, design library)
- The v1 flow from card creation through to spec merge
- Where files live (specs in `.workhorse/specs/`, mockups in `.workhorse/design/mockups/`, design system in `.workhorse/design/`)
- The spec file format (markdown with YAML frontmatter, checkbox criteria, blockquote open questions)
- Writing conventions (describe system as it should be, no implementation details, Australian/NZ English)
- Mockup format (standalone HTML/CSS, design system palette, HTML comment header linking to spec)
- Conversation style (concise, professional, 1-2 questions at a time, don't reproduce files in chat)

This context means the agent never needs to explore the codebase to understand how Workhorse itself works — it already knows.

**2. Card context** — dynamic, per-session:

- Card title, identifier, and description
- Project name, repository owner and name
- File path guidance for this card's specs and mockups
- Attachment file list (if any)

**3. Skill-specific instructions** — driven by the skill that triggered the session (see `workflow-orchestration.md`):

Each skill maps to a system prompt fragment that shapes the agent's behaviour. The skill parameter flows from the trigger (pill, journey section, or scheduling) → API → system prompt builder. Skills include: workshop, interview, draft spec, review spec, implement, design audit, security audit, code review, and custom project-defined skills.

### Context window management

- [ ] The Agent SDK handles context window compaction automatically
- [ ] Long sessions that exceed the context window are compacted by the SDK, preserving the most relevant context

### Session persistence and resumption

- [ ] Agent SDK sessions persist to disk automatically (in `~/.claude/projects/`)
- [ ] `session_id` stored on the `ConversationSession` record (see `conversation-sessions.md`)
- [ ] Resume sessions with `resume: sessionId` on subsequent turns
- [ ] Session transcript retrievable via `getSessionMessages()` for audit/display
- [ ] Individual messages are not stored in Workhorse's database — the SDK transcript is the source of truth for conversation history. Interim/final classification is derived positionally at read time (see `agent-streaming-status.md`)
- [ ] Multiple sessions per card — each is an independent Agent SDK session with its own context
- [ ] Standalone sessions (no card) — used for Q&A, exploration, small fixes. May auto-create a card when file changes occur

### Fresh-eyes review

- [ ] A separate agent call with no conversation history (deliberately fresh context)
- [ ] Uses `persistSession: false` — ephemeral, no resumption needed
- [ ] Read-only tools only: `Read`, `Glob`, `Grep`
- [ ] Reviews spec files on disk in the worktree

## Streaming and UI

### What the user sees during an agent query

A single user message may trigger a long sequence of internal work — thinking, reading files, searching code, writing specs — that can take 30 seconds or more. The user doesn't need to see the machinery. They need reassurance that the agent is working, and then the response when it arrives.

- [ ] Thinking events, tool calls, file reads, and searches are not shown individually — all internal activity is behind a thinking indicator (see `agent-streaming-status.md` for indicator behaviour, activity lifecycle, and recovery on navigation)
- [ ] File write/edit operations are the one exception: these appear as persistent notifications (e.g. "Updated specs/patient/allergies.md") since they represent meaningful output the user may want to act on
- [ ] The thinking indicator is visible for the entire duration the agent is active, sitting below the growing assistant message. It does not disappear when text arrives — it remains as a continuous activity signal until the agent finishes
- [ ] Each internal agent turn produces a separate assistant message. Interim messages (narration during tool work) are visible while the agent is active, then collapse when the turn completes, leaving only the final substantive response. See `agent-streaming-status.md` for the interim/final classification and collapsing behaviour
- [ ] Soft-lock on the spec editor during active work ("Agent is working...")

### Agent turn limits and result handling

The Agent SDK returns a `result` event at the end of every query. This is not necessarily an error — the agent may have produced a complete, useful response within the allowed turns. The `result` event carries metadata including whether the agent wanted to keep going (`stop_reason: "tool_use"` means it was mid-flow; `stop_reason: "end_turn"` means it finished naturally).

- [ ] The turn limit is set high enough that the agent can complete a typical interview turn without being cut short (at least 10 turns rather than 3)
- [ ] When a `result` event has `subtype: "error_max_turns"` and `stop_reason: "tool_use"` (the agent was cut off mid-work), the UI appends a brief assistant message noting that the interviewer had more to do and inviting the user to send another message to continue
- [ ] When a `result` event has `subtype: "error_max_turns"` but the agent already produced a text response in an earlier turn, the continuation message is non-alarming — the agent did useful work, it just didn't get to finish everything it wanted to do
- [ ] The continuation message is written in the interviewer's voice (e.g. "I had more to explore but ran out of steps — send another message and I'll continue"), not as a raw technical error
- [ ] A `result` event with no error subtype (normal completion) is not shown to the user
- [ ] Other error subtypes in `result` events are surfaced as friendly assistant messages

### API route

- [ ] `POST /api/agent-session` streams Agent SDK events to the client via Server-Sent Events (SSE)
- [ ] Captures `session_id` on init, stores on Feature record
- [ ] Frontend `useAgentSession` hook consumes SSE and updates UI state

## Spec and mockup files

### Specs written directly to disk

The agent writes spec files in the standard format to `.workhorse/specs/` within the worktree. The files panel and artifact view read files from the worktree via `fs.readFile()`.

- [ ] Agent creates new spec files at paths it determines based on codebase structure
- [ ] Agent edits existing spec files in place when refining criteria
- [ ] Files panel lists files from `git diff --name-only main` filtered to `.workhorse/specs/` and `.workhorse/design/mockups/`
- [ ] New vs existing detection: file doesn't exist on `main` branch = new

### Mockups written directly to disk

The agent writes mockup HTML files to `.workhorse/design/mockups/{card-id}/` within the worktree.

- [ ] Each mockup is a standalone HTML file with inline CSS
- [ ] Mockup files include an HTML comment header referencing their spec: `<!-- spec: patient/allergies.md -->`
- [ ] Mockup artifact reads files from disk (same as spec artifact)
- [ ] Agent can revise mockups when asked — just edits the file
- [ ] Mockups are auto-committed alongside specs

### Data model

The git branch is the source of truth for spec and mockup content. No database tables for file content or chat messages:

- **File paths touched by a card:** `git diff --name-only main` on the card's branch
- **New vs existing:** file doesn't exist on `main`
- **Current content:** `fs.readFile()` in the worktree
- **Conversation history:** Agent SDK session storage on disk, resumable by `session_id`. Display in UI via `getSessionMessages()`

## Auto-commit model

Every change to spec and mockup files is committed and pushed to the card's branch automatically. The branch is always up to date — there is no "uncommitted work."

### Agent turns

- [ ] At the end of each agent turn, auto-commit all changed files and push to the branch
- [ ] The agent generates a descriptive commit message summarising what it did (e.g. "initial draft with 5 acceptance criteria for allergies", "added edge case for expired allergies")
- [ ] If the server dies mid-turn, at most one turn's work is lost. The agent session can be restarted and asked to redo its last step
- [ ] Commit is attributed to the card's assignee (or the user who started the session), with a trailer indicating the AI authored the content

### User edits

- [ ] When a user finishes editing a spec file (leaves edit mode / clicks "Done editing"), auto-commit and push
- [ ] The UI prompts for a brief description of the change, pre-filled by the AI (e.g. "added edge case for expired allergies"). User can accept, edit, or skip
- [ ] No commit on every keystroke — only when the user transitions from edit mode to view mode
- [ ] This avoids excessive version noise while still capturing every meaningful save point

### Commit messages

Commit messages are AI-generated and descriptive, not mechanical. They describe **what changed and why**:

```
allergies.md:
  3 min ago    Felix — added edge case for expired allergies
  12 min ago   Workhorse — initial draft with 5 criteria
  15 min ago   Workhorse — created file
```

Users never see SHAs or branch names. The Changes view in the artifact header shows what's different from the base branch — this is the primary way users understand changes in this card.

### Marking specs ready

Work is always saved to git — there is no manual save/commit action. The "Mark ready" action is a quality gate:

- [ ] "Mark ready" transitions the card from `SPECIFYING` → `IMPLEMENTING`
- [ ] This is a status transition, not a git operation — specs are already on the branch
- [ ] No PR is created at this point. The implementation phase creates PRs when the developer is ready
- [ ] The AI pushes back if areas remain uncovered
- [ ] Presented as a secondary action (status dropdown or subtle button), not a prominent CTA — the normal flow is iterating until the spec is solid

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

## Naming conventions

"Spec" refers to the spec document itself. "Card" refers to the unit of work (feature card). "Session" refers to the AI agent session. "Interview" is one mode the agent can operate in (alongside draft, review, directed, etc.).

### Feature model fields

- `Feature.cardBranch` — the git branch for this card's work
- `Feature.agentSessionId` — the Agent SDK session ID for resumption
- Changed file lists are derived from `git diff` against the default branch at query time

### Routes and hooks

- `/api/agent-session` — the agent session SSE endpoint
- `useAgentSession` — frontend hook for the agent session chat
- `CardWorkspace` — the main card workspace orchestrator
- Chat column — column-based chat (left side in artifact mode, centred when no artifact)

### Components that reference "spec" (correct — they deal with spec documents)

- `SpecEditor`, `SpecDocument`, `SpecExplorer`, `SpecTree`, `FilesPanel`
- `src/lib/specs/`, `src/lib/git/commitSpecs.ts`, `src/lib/git/specTree.ts`
- `spec_updated` activity type

## Card statuses

Statuses are configurable per project (see `workflow-orchestration.md`). Statuses are decoupled from skills — any skill can be triggered in any status. Backward transitions are allowed.

## Handoff to external agents

A handoff button in the topbar generates a context-rich briefing prompt for external agents (Claude Code, Cursor, or any other AI tool). See `workflow-orchestration.md` for full details.

## External agent collaboration

The worktree-on-disk architecture means that any agent with access to the same branch can participate.

- [ ] The external agent operates on the same branch as the card
- [ ] It reads/writes the same spec and mockup files the built-in agent does
- [ ] On return to Workhorse, the UI reflects any changes (it reads from disk)
- [ ] Workhorse detects changed files on focus and refreshes (last-write-wins)
- [ ] The jockey detects external commits on the card's branch and updates the journal accordingly

## Open questions

> **Worktree disk pressure:** For very large monorepos, even with partial clone, working tree checkout could be slow or large. Should we support sparse checkout (only materialise relevant directories)?

> **Session transcript display:** The UI shows text messages only. Internal tool calls are hidden behind the thinking indicator. Multi-turn assistant messages are classified as interim (narration) or final (substantive response) — interim messages collapse after the agent finishes, final messages remain visible. See `agent-streaming-status.md`.

> **Branch strategy for dependencies:** If card WH-043 depends on WH-042, should WH-043's worktree branch from WH-042's branch?
