---
title: Conversation sessions
area: agent
status: draft
---

Conversations are the primary interaction model in Workhorse. A conversation session is an independent thread of dialogue between a user and the AI agent. Sessions can exist standalone (without a card) or be associated with a card. A card can have multiple sessions, and standalone sessions can become card-bound when the conversation reveals work to be done.

## Key concepts

- **Session** — an independent conversation thread with its own Agent SDK session, message history, and auto-generated title. The atomic unit of AI interaction.
- **Standalone session** — a session with no card. Used for asking questions, exploring the codebase, quick fixes, or any conversation that doesn't (yet) warrant a card.
- **Card session** — a session linked to a card. Multiple sessions per card. Each session is a separate conversation thread (e.g. initial interview, follow-up refinement, error handling discussion).
- **Active session** — the session currently displayed when viewing a card. Stored as `activeSessionId` on the card.

## Data model

### ConversationSession

```prisma
model ConversationSession {
  id              String   @id @default(cuid())
  cardId          String?  // null for standalone sessions
  teamId          String?  // for standalone sessions, determines which team's board context
  userId          String   // who created this session
  agentSessionId  String?  // Agent SDK session ID for resumption
  title           String?  // auto-generated from first exchange
  messageCount    Int      @default(0)
  lastMessageAt   DateTime @default(now())
  createdAt       DateTime @default(now())

  card Card? @relation(fields: [cardId], references: [id], onDelete: Cascade)
  team Team? @relation(fields: [teamId], references: [id], onDelete: SetNull)
  user User  @relation(fields: [userId], references: [id])

  @@index([cardId, lastMessageAt(sort: Desc)])
  @@index([userId, lastMessageAt(sort: Desc)])
}
```

### Card changes

- [ ] Remove `agentSessionId` from Card (replaced by `ConversationSession.agentSessionId`)
- [ ] Add `activeSessionId String?` — the session to display when opening the card
- [ ] Add `sessions ConversationSession[]` relation

### User changes

- [ ] Add `sessions ConversationSession[]` relation

### Team changes

- [ ] Add `sessions ConversationSession[]` relation (for standalone sessions in a team context)

## Session lifecycle

### Creating sessions

- [ ] **From a card:** typing in the chat input creates a new session if there is no active session, or continues the active session. A "New conversation" action explicitly creates a fresh session
- [ ] **From the sidebar:** a "New conversation" button at the top of the sidebar creates a standalone session with no card
- [ ] **From anywhere:** sessions are cheap to create. No ceremony, no dialog. Type and go

### Auto-titling

- [ ] After the first assistant response, generate a title from the first user message (truncated to ~50 chars, cleaned up to read naturally)
- [ ] Title generation is a simple heuristic, not an extra AI call — take the first sentence or clause of the user's first message
- [ ] Title can be manually renamed later (stretch goal, not v1 priority)
- [ ] Untitled sessions show as "New conversation" in the UI

### Auto-card creation for standalone sessions

Standalone sessions often reveal work that needs tracking. Workhorse creates cards behind the scenes when there's enough signal — smoothly and invisibly to the user.

- [ ] After each assistant response in a standalone session, evaluate whether the conversation implies actionable work (the agent wrote files, discussed a specific change, identified a bug to fix)
- [ ] The evaluation is done server-side by inspecting the agent's actions: if the agent wrote or edited spec/code files, that's strong signal. If the conversation is purely Q&A with no file changes, no card is needed
- [ ] When a card is warranted, create it automatically: derive title from the session title, set status to SPECIFYING, link to the session's team (or prompt for team if no team context)
- [ ] The session's `cardId` is set to the new card. The card's `activeSessionId` is set to this session
- [ ] The user sees a subtle, non-blocking notification: "Created card WH-XXX" as a toast or inline notice in the chat. Not a dialog, not a confirmation prompt
- [ ] If the user navigates to the card, they see the full conversation history — it was always there, just didn't have a card wrapper until now
- [ ] If the conversation remains purely Q&A (no files written, no changes implied), no card is ever created. The session lives as a standalone conversation accessible from "Recent" in the sidebar

### Continuing vs starting new

On the card home page, the UX for "continue last session" vs "start a new conversation" works as follows:

- [ ] The chat input always continues the **active session**. Typing and sending a message resumes that session. This is the default, zero-friction path
- [ ] Above the chat area, a session bar shows the active session title and message count. Clicking it opens a dropdown listing all sessions for the card
- [ ] The dropdown includes a "+ New conversation" action at the bottom, which creates a fresh session and makes it active
- [ ] When the card has no sessions yet (first visit), typing in the input creates the first session implicitly — no extra step
- [ ] When returning to a card, the active session's history loads automatically. The user sees where they left off

This means: **the input always continues the current session**. Starting a new one is a deliberate action via the session bar. This avoids the current problem where returning to a card feels like starting from scratch.

### Switching sessions

- [ ] Selecting a different session from the dropdown sets it as the card's `activeSessionId` and loads its history
- [ ] If the selected session's Agent SDK session is stale (expired, storage cleared), the history still loads from what we have (title, message count indicate there was content), and the next message starts a fresh Agent SDK session under the same `ConversationSession` record
- [ ] The previous session remains accessible — switching is non-destructive

## URL structure

```
/tamanu/cards/WH-042                     → card detail, active session loaded
/tamanu/cards/WH-042?session=clxyz123    → card detail, specific session loaded
/tamanu/sessions/clxyz123                → standalone session (no card), or redirects to card if one exists
```

- [ ] Query param `?session=` on card pages selects a specific session and sets it as active
- [ ] Standalone sessions get their own route since they have no card to hang off
- [ ] If a standalone session acquires a card (via auto-creation), the standalone URL redirects to the card URL with `?session=`

## Sidebar: recent sessions

The sidebar gains a "Recent" section showing the most recently active sessions across all cards and standalone sessions.

### Data

- [ ] Fetch the 8 most recent sessions by `lastMessageAt` for the current user, filtered to accessible projects
- [ ] Each entry shows: team colour dot, card identifier (if card-bound) or "Chat" label, and the session title
- [ ] Standalone sessions without a card show just the session title with no identifier prefix

### Display

```
┌─ Workhorse ──────────┐
│  ▾ Tamanu             │
├───────────────────────┤
│  Specs                │
│  Design               │
├───────────────────────┤
│  TEAMS                │
│  ● Server             │
│  ● Mobile             │
├───────────────────────┤
│  RECENT               │
│  ● WH-042 Initial…   │  ← card-bound session, team colour dot
│  ● Fix login timeout  │  ← standalone session, team colour dot
│  ● WH-038 Refine…    │
│  ● Schema question    │  ← standalone, Q&A, never got a card
│  ● WH-042 Error ha…  │
│                       │
│  ─── user menu ───    │
└───────────────────────┘
```

- [ ] Each item is a deep link. Card-bound sessions link to `/tamanu/cards/WH-042?session=clxyz123`. Standalone sessions link to `/tamanu/sessions/clxyz123`
- [ ] Clicking a recent item navigates directly to that session, preserving context
- [ ] The "Recent" section updates when sessions are created or receive new messages (server component revalidation or client-side refresh)

### New conversation button

- [ ] A "+ New" button or icon appears in the sidebar header area or near the Recent section header
- [ ] Clicking it opens a standalone session immediately — no dialogs, no team selection (defaults to last-used team or first available)
- [ ] The new session appears at the top of Recent and the main content area shows an empty chat ready for input

## Session bar on card page

The session bar sits between the card header and the chat area. It's a compact, single-line element.

### Layout

```
┌─────────────────────────────────────────────────────┐
│  ← WH-042  Fix patient search                      │  ← CardDetailShell
├─────────────────────────────────────────────────────┤
│  💬 Initial spec interview · 12 msgs     ▾   + New │  ← Session bar
├─────────────────────────────────────────────────────┤
│  [chat messages...]                                 │
│  [input bar]                                        │
└─────────────────────────────────────────────────────┘
```

- [ ] Left: session title and message count (subtle, muted text for the count)
- [ ] Centre-right: dropdown chevron to open session list
- [ ] Right: "+ New" button to start a fresh session
- [ ] The bar uses compact styling: 13px text, muted colours, no heavy borders — just a subtle bottom border matching `--border-subtle`

### Session dropdown

- [ ] Lists all sessions for the card, ordered by `lastMessageAt` descending
- [ ] Each row shows: title (or "New conversation"), message count, relative timestamp ("2h ago", "yesterday")
- [ ] Active session has a subtle highlight
- [ ] Bottom row: "+ New conversation" action
- [ ] Dropdown uses the same styling as the project switcher in the sidebar (consistent pattern)

## API changes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/agent-session` | POST | Accept optional `sessionId`. Create `ConversationSession` on first message if none exists. Update `messageCount` and `lastMessageAt` after each exchange |
| `/api/chat-history` | GET | Accept `sessionId` instead of (or in addition to) `cardId`. Look up `agentSessionId` from the `ConversationSession` row |
| `/api/sessions` | GET | List sessions for a card (`?cardId=xxx`) or for the current user's recent (`?recent=true&limit=8`) |
| `/api/sessions` | POST | Create a new session explicitly (for "+ New conversation") |
| `/api/sessions/[id]/title` | PATCH | Rename a session title |

## Component changes

| Component | Change |
|-----------|--------|
| `Sidebar` | Add `recentSessions` prop. Render "Recent" section with deep links. Add "+ New" button |
| `CardWorkspace` | Add `sessions` and `activeSessionId` props. Render session bar. Handle session switching and creation |
| `useAgentSession` | Accept `sessionId` instead of `cardId` for history loading. Pass `sessionId` to API calls |
| Card page (server) | Fetch sessions for the card. Resolve `?session=` query param or fall back to active session |
| Main layout (server) | Fetch recent sessions for the sidebar |

## Migration

- [ ] Create `ConversationSession` table
- [ ] For each card with an `agentSessionId`, create a `ConversationSession` row with `cardId` set, `agentSessionId` copied over, and title set to "Previous conversation"
- [ ] Set `activeSessionId` on each migrated card to its new session's ID
- [ ] Remove `agentSessionId` from Card model (can be done in same migration since data is moved)

## Open questions

> **Team context for standalone sessions:** When a user creates a standalone session without specifying a team, should we default to their most recently used team? Or leave `teamId` null and only set it when a card is auto-created? Leaning toward defaulting to last-used team since it determines which project's codebase the agent operates on.

> **Session limits:** Should there be a soft limit on sessions per card? Probably not — let users create as many as they want. Old sessions naturally fall off the "Recent" list. But worth monitoring for UI clutter in the session dropdown.

> **Agent SDK session expiry:** The Agent SDK stores sessions on disk. If they expire or are cleaned up, we lose the ability to resume. The `ConversationSession` record persists regardless, so the user still sees the session in their list — they just can't resume the exact agent context. New messages start a fresh Agent SDK session. Is this acceptable, or should we store message content in our DB as a backup? For v1, the Agent SDK is the source of truth and we accept graceful degradation.

> **Auto-card creation triggers:** Beyond file writes, are there other signals that a standalone session should get a card? E.g. if the user says "let's make a ticket for this" or "this needs tracking." Could use keyword detection, but heuristics are fragile. For v1, file writes are the trigger; explicit user action ("Create card from this") is the fallback.
