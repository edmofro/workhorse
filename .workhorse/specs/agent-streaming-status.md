---
title: Agent activity status
area: agent
card: WH-070
---

Workhorse tracks and displays the AI agent's activity status so users always know whether the agent is working or idle. The status is reliable across navigation, page refresh, reconnection, and server restarts.

## Activity lifecycle

A conversation session is in one of two states: **idle** or **active**. The `ConversationSession` model has an `agentActiveAt` timestamp column, nullable. A non-null value means the agent is working on behalf of this session.

- [ ] `agentActiveAt` is set to the current time at the very start of the agent-session request handler — before the Agent SDK query begins, before any streaming events are produced. This ensures the sidebar and other views reflect activity immediately, including during SDK setup
- [ ] `agentActiveAt` is cleared to null when the agent query completes (success, error, or abort)
- [ ] A session whose `agentActiveAt` is older than 10 minutes is considered stale — the server crashed or redeployed without cleaning up. Any code that reads activity status treats a stale timestamp as idle and clears it

## Crash detection and auto-resume

Server restarts during active agent work are common (deploys, crashes). The system detects orphaned sessions and automatically resumes them.

### Advisory lock mechanism

- [ ] When the agent-session route starts processing, it acquires a Postgres session-level advisory lock keyed to the conversation session (e.g. a hash of the session ID)
- [ ] Session-level advisory locks (`pg_advisory_lock`) are automatically released when the database connection drops — which happens on server restart, crash, or process exit
- [ ] The lock is held for the duration of the agent query. It is released explicitly on completion, or implicitly if the process dies

### Orphan detection

- [ ] On application startup, the server queries for sessions where `agentActiveAt` is non-null but no advisory lock is held for that session
- [ ] These are orphaned sessions — the agent process died without cleaning up

### Auto-resume

- [ ] For each orphaned session, the server kicks off a new agent query using the Agent SDK's `resume` capability, which picks up the full conversation context from the SDK's on-disk session storage
- [ ] The resume sends a system-level continuation prompt so the agent understands it was interrupted and should continue where it left off
- [ ] The resumed session follows the normal activity lifecycle: `agentActiveAt` is set, events are published, and the session completes normally
- [ ] If the Agent SDK session has expired or been cleaned up, the orphaned session is simply marked idle (graceful degradation)

## Unified event architecture

All real-time UI updates flow through a single path: database changes trigger Postgres notifications, which fan out to connected clients via SSE. There is no manual event emission in application code.

### Database notifications

- [ ] A Postgres trigger on the `ConversationSession` table fires `pg_notify` whenever `agentActiveAt`, `title`, `messageCount`, or `lastMessageAt` changes
- [ ] The notification payload includes the session ID, the user ID, and which fields changed
- [ ] A single long-lived `LISTEN` connection on the server receives these notifications and fans them out to the appropriate SSE subscribers (sidebar events, session events)
- [ ] This replaces all manual `emitSidebarEvent()` calls — any code path that updates a session automatically triggers the right events

### Session event stream

Each active agent session broadcasts its SDK events (thinking deltas, text deltas, tool use, results) through an in-memory pub/sub channel keyed by session ID.

- [ ] The agent-session route publishes every SDK event into the session's pub/sub channel
- [ ] A dedicated SSE endpoint (`/api/sessions/[id]/events`) allows clients to subscribe to the live event stream for a session. If the session is idle, the endpoint sends a single `idle` event and closes. If the session is active, it streams events in real time until the session completes
- [ ] The endpoint requires authentication and verifies the user owns the session
- [ ] Each channel retains a bounded replay buffer (last 50 events) so that a subscriber connecting mid-stream receives recent context rather than starting from nothing

### Client always subscribes via pub/sub

- [ ] When a user sends a message, the client POSTs to `/api/agent-session` and receives a session ID in the response
- [ ] The client then subscribes to `/api/sessions/[id]/events` to receive all SDK events — the same endpoint used for recovery on return
- [ ] There is one code path on the client for consuming events, whether the user just sent the message, navigated back mid-stream, or opened the conversation in another tab
- [ ] The agent-session POST response does not stream SDK events directly; it returns the session ID and a success status. All event delivery goes through the pub/sub SSE endpoint

## Thinking indicator

The thinking indicator appears in the chat area for the entire duration the agent is active. It sits below the current (growing) assistant message, providing continuous feedback about what the agent is doing.

### When it shows

- [ ] The thinking indicator is visible whenever the agent is active — from the moment the user sends a message until the agent query completes
- [ ] It does not disappear when the first text arrives. It remains below the streaming text throughout the multi-turn loop
- [ ] The indicator is identical across all views: CardWorkspace chat zone, ChatSessionView, and FloatingChat
- [ ] On recovery (navigating back to an active session), the indicator appears immediately based on `agentActiveAt` being non-null, even before any replay events arrive. It defaults to "Thinking..." until a more specific verb can be derived from events

### Verb ticker

The indicator displays a cycling action verb that describes what the agent is currently doing.

- [ ] A pulsing accent-coloured dot sits to the left of the verb text
- [ ] The dot pulses gently (scale and opacity) on a 1.4-second cycle
- [ ] Verbs are derived from the agent's actual tool use: a Read tool call shows "Reading...", a Grep/Glob shows "Searching...", a Write/Edit shows "Editing...". When no tool context is available (pure thinking), it shows "Thinking..."
- [ ] The verb cross-fades when it changes (120ms fade out, swap, fade in)
- [ ] Below the verb, an optional thinking snippet line shows a fragment of the agent's internal reasoning in faint text, truncated to one line. This is ephemeral texture — it conveys busy-ness, not readable information
- [ ] The snippet is sampled from `thinking_delta` events every 1.5 seconds and cross-fades on update (150ms)

## Message rendering

A single user message can trigger multiple internal agent turns (think, tool use, think again, respond, tool use, respond again). The Agent SDK stores each turn as a separate assistant message in its transcript. The UI distinguishes between **interim** messages (narration during tool work) and the **final** message (the substantive response).

### Interim vs. final classification

Messages are classified positionally from the SDK transcript, with no additional storage needed:

- [ ] In a consecutive run of assistant messages between two user messages, the last assistant message is the **final** message. All preceding assistant messages in that run are **interim**
- [ ] At the end of the transcript (after the last user message), if `agentActiveAt` is null (agent finished), the last assistant message is final. If `agentActiveAt` is non-null (agent still working), all messages in the run are treated as in-progress — none is final yet
- [ ] Empty assistant messages (turns that only used tools without producing text) are excluded entirely

### Display behaviour

- [ ] **While the agent is active**: all messages in the current run are visible, streaming in as they arrive. The user sees the full narration as a progress signal
- [ ] **After the agent finishes** (same session, live): interim messages in the completed run collapse, leaving only the final message visible. A subtle expandable summary replaces them (e.g. "Worked through 3 steps" or similar), allowing the user to expand and see the full narration if they want to
- [ ] **On return to a completed conversation**: interim messages start collapsed. Only final messages and user messages are visible by default. The expandable summary is available for each collapsed group
- [ ] **On return to an active conversation**: the current in-progress run is expanded (all messages visible), matching the live experience. Completed earlier runs are collapsed as normal

### Chat history endpoint

- [ ] The chat history endpoint reads the SDK transcript via `getSessionMessages()` and classifies each assistant message as interim or final using the positional rule
- [ ] The response includes the classification so the client can render collapsed/expanded state without re-deriving it
- [ ] The endpoint also checks `agentActiveAt` for the session to determine whether the final run is still in progress

## Sidebar activity indicator

The sidebar shows which conversations have an active agent with a pulsing animation on the session title.

- [ ] The sidebar SSE endpoint subscribes to Postgres notifications for `agentActiveAt` changes scoped to the authenticated user
- [ ] On initial connection, the endpoint queries for all sessions with non-null `agentActiveAt` (excluding stale) and sends them as the initial set
- [ ] When `agentActiveAt` changes (set or cleared), the notification triggers an SSE event to the client
- [ ] The client maintains a Set of active session IDs and renders pulsing indicators accordingly

## Stale activity cleanup

Server crashes, redeploys, and network failures can leave sessions marked as active when no agent is running. Beyond the advisory lock mechanism for auto-resume, a fallback cleanup handles edge cases.

- [ ] A session whose `agentActiveAt` is older than 10 minutes is treated as stale by any code that reads it
- [ ] The session event stream endpoint, if asked about a session whose `agentActiveAt` is stale, clears it and returns `idle`
- [ ] The advisory lock check on startup is the primary mechanism. The 10-minute threshold is a safety net for cases where the lock check missed something (e.g. the lock was held by a connection that hasn't fully timed out yet)
