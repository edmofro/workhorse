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
- **Card home** — the card's landing page: metadata, conversations list, specs list, and an input bar. A hub, not a chat view.

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

Session titles should help users distinguish conversations at a glance in the sidebar and card home. Pill-based messages ("Where were we up to?", "Draft spec") make poor titles.

- [ ] For card-bound sessions, the default title format is the card title (e.g. "Fix patient search") since most sessions are about the card's topic
- [ ] After the first full exchange (user message + assistant response), generate a refined title using a lightweight heuristic: extract a meaningful summary from the user's message, ignoring generic pill text
- [ ] Title generation is a simple heuristic, not an extra AI call — take the first sentence or clause of the user's first message
- [ ] Known pill messages (exact matches for action pill text) are not used as titles. Instead, fall back to the card title or "New conversation"
- [ ] After the assistant's first response, if the response contains substantive content, refine the title by extracting the first meaningful sentence from the assistant's reply (truncated to ~60 chars). This replaces the initial title
- [ ] Title can be manually renamed later (stretch goal, not v1 priority)
- [ ] Untitled sessions show as "New conversation" in the UI
- [ ] In the sidebar, card-bound sessions show "{cardIdentifier}: {title}" — the card title provides enough context to distinguish sessions across cards

### Auto-card creation for standalone sessions

Standalone sessions often reveal work that needs tracking. Workhorse creates cards behind the scenes when there's enough signal — smoothly and invisibly to the user.

- [ ] After each assistant response in a standalone session, evaluate whether the conversation implies actionable work (the agent wrote files, discussed a specific change, identified a bug to fix)
- [ ] The evaluation is done server-side by inspecting the agent's actions: if the agent wrote or edited spec/code files, that's strong signal. If the conversation is purely Q&A with no file changes, no card is needed
- [ ] When a card is warranted, create it automatically: derive title from the session title, set status to SPECIFYING, link to the session's team (or prompt for team if no team context)
- [ ] The session's `cardId` is set to the new card. The card's `activeSessionId` is set to this session
- [ ] The user sees a subtle, non-blocking notification: "Created card WH-XXX" as a toast or inline notice in the chat. Not a dialog, not a confirmation prompt
- [ ] If the user navigates to the card, they see the full conversation history — it was always there, just didn't have a card wrapper until now
- [ ] If the conversation remains purely Q&A (no files written, no changes implied), no card is ever created. The session lives as a standalone conversation accessible from "Recent" in the sidebar

### Card home page: conversations as navigable items

The card home page is a hub — it shows card metadata, a list of conversations, a list of specs/mockups, and a text input. Sessions are navigable destinations, not inline chat. This matches how the sidebar treats sessions (clickable items that take you somewhere).

```
┌─────────────────────────────────────────────────────────────┐
│  ← WH-042  Fix patient search                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [card details: title, description, metadata]               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  CONVERSATIONS                                              │
│  💬 Error handling follow-up        4 msgs · 1h ago    →   │
│  💬 Initial spec interview         12 msgs · 2h ago    →   │
│                                                             │
│  SPECS & MOCKUPS                                   + New    │
│  📄 patient-search                                 updated  │
│  📄 search-diacritics                                 new   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│        Draft spec    Interview    Review                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Start a new conversation...                           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- [ ] Past sessions appear as a "Conversations" section alongside "Specs & Mockups", ordered by `lastMessageAt` descending
- [ ] Each session row shows: title, message count (muted), relative timestamp, and an arrow affordance
- [ ] Clicking a session navigates to the chat zone with that session loaded (same as clicking a spec opens the spec view)
- [ ] The input bar at the bottom **always starts a new session**. Typing and sending creates a fresh session and navigates to the chat zone
- [ ] When the card has no sessions yet, the conversations section is absent — just the empty-state text and input, same as today
- [ ] Action pills (Draft spec, Interview, Review) also start new sessions

### Chat zone: inside a session

Navigating into a session (from card home or sidebar) enters the chat zone — a full conversation view for that specific session.

```
┌─────────────────────────────────────────────────────────────┐
│  ← WH-042  Error handling follow-up                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [full message history for this session]                    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Continue the conversation...                          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- [ ] The header shows the card identifier + session title. The back arrow returns to card home
- [ ] The input bar continues this session — messages are sent to the existing Agent SDK session
- [ ] If the Agent SDK session is stale (expired, storage cleared), the next message starts a fresh Agent SDK session under the same `ConversationSession` record. The user doesn't notice — their history is still there, the agent just has fresh context
- [ ] Specs panel, artifact view, and focus mode all work as before within the chat zone

## URL structure

```
/tamanu/cards/WH-042                     → card detail, active session loaded
/tamanu/cards/WH-042?session=clxyz123    → card detail, specific session loaded
/tamanu/sessions/clxyz123                → standalone session (no card), or redirects to card if one exists
```

- [ ] Query param `?session=` on card pages selects a specific session, sets it as active, and auto-navigates to the chat zone (not just card home)
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
- [ ] The "Recent" section updates reactively: when a new session is created or receives messages, the sidebar refreshes via `router.refresh()`. Active/streaming sessions show a subtle pulsing indicator on their title text to signal ongoing work
- [ ] When navigating to a card via a sidebar session deep link (`?session=`), the card page auto-opens the chat zone for that session (not just the card home)

### New conversation button

- [ ] A "+ New" button or icon appears in the sidebar header area or near the Recent section header
- [ ] Clicking it opens a standalone session immediately — no dialogs, no team selection (defaults to last-used team or first available)
- [ ] The new session appears at the top of Recent and the main content area shows an empty chat ready for input

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
| `CardWorkspace` | Add `sessions` prop. Render conversations list on card home (alongside specs). Input starts new session and navigates to chat zone |
| `CardDetailShell` | When inside a session, show session title in header alongside card identifier. Back arrow returns to card home |
| `useAgentSession` | Accept `sessionId` instead of `cardId` for history loading. Pass `sessionId` to API calls |
| Card page (server) | Fetch sessions for the card. Resolve `?session=` query param to load specific session in chat zone |
| Main layout (server) | Fetch recent sessions for the sidebar |

## Migration

- [ ] Create `ConversationSession` table
- [ ] For each card with an `agentSessionId`, create a `ConversationSession` row with `cardId` set, `agentSessionId` copied over, and title set to "Previous conversation"
- [ ] Remove `agentSessionId` from Card model (can be done in same migration since data is moved)

## Open questions

> **Team context for standalone sessions:** When a user creates a standalone session without specifying a team, should we default to their most recently used team? Or leave `teamId` null and only set it when a card is auto-created? Leaning toward defaulting to last-used team since it determines which project's codebase the agent operates on.

> **Agent SDK session expiry:** The Agent SDK stores sessions on disk. If they expire or are cleaned up, we lose the ability to resume. The `ConversationSession` record persists regardless, so the user still sees the session in their list — they just can't resume the exact agent context. New messages start a fresh Agent SDK session. Is this acceptable, or should we store message content in our DB as a backup? For v1, the Agent SDK is the source of truth and we accept graceful degradation.

> **Auto-card creation triggers:** Beyond file writes, are there other signals that a standalone session should get a card? E.g. if the user says "let's make a ticket for this" or "this needs tracking." Could use keyword detection, but heuristics are fragile. For v1, file writes are the trigger; explicit user action ("Create card from this") is the fallback.
