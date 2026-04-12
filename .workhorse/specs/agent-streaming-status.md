---
title: Agent streaming status
area: agent
card: WH-070
---

Workhorse tracks and displays the AI agent's streaming status so users always know whether the agent is thinking, responding, or idle. The status is reliable across navigation, page refresh, reconnection, and server restarts.

## Streaming lifecycle

A conversation session is in one of two states: **idle** or **streaming**. The transition from idle to streaming happens when the server begins an agent query. The transition back to idle happens when the agent query completes, errors, or is interrupted.

- [ ] The `ConversationSession` model has a `streamingStartedAt` timestamp column, nullable. A non-null value means the session is actively streaming
- [ ] When the server starts an agent query for a session, it sets `streamingStartedAt` to the current time
- [ ] When the agent query completes (success, error, or abort), the server clears `streamingStartedAt` to null
- [ ] A session whose `streamingStartedAt` is older than 10 minutes is considered stale — the server crashed or redeployed without cleaning up. Any code that reads streaming status treats a stale timestamp as idle and clears it

## Thinking indicator

The thinking indicator appears in the chat area while the agent is working, before any visible text output has arrived. It conveys active, purposeful work — not a static spinner.

### When it shows

- [ ] The thinking indicator appears as soon as `isStreaming` is true and the last assistant message has empty content — regardless of whether a verb or snippet has arrived yet
- [ ] This condition is the same across all three views: CardWorkspace chat zone, ChatSessionView, and FloatingChat
- [ ] Once the first `text_delta` arrives and the assistant message has content, the thinking indicator disappears

### Verb ticker

The indicator displays a cycling action verb that describes what the agent is currently doing. The verb cross-fades to the next one every few seconds, giving continuous visible motion without being distracting.

- [ ] A pulsing accent-coloured dot sits to the left of the verb text
- [ ] The dot pulses gently (scale and opacity) on a 1.4-second cycle
- [ ] The verb text displays the agent's current activity: "Reading codebase...", "Searching files...", "Exploring specs...", "Drafting response..." and similar
- [ ] Verbs are derived from the agent's actual tool use when available — a Read tool call shows "Reading codebase...", a Grep shows "Searching files...", a Write/Edit shows "Writing specs...". When no tool context is available (pure thinking), it shows "Thinking..."
- [ ] The verb cross-fades when it changes (120ms fade out, swap, fade in)
- [ ] Below the verb, an optional thinking snippet line shows a fragment of the agent's internal reasoning in faint text, truncated to one line. This is ephemeral texture — it conveys busy-ness, not readable information
- [ ] The snippet is sampled from `thinking_delta` events every 1.5 seconds and cross-fades on update (150ms)

## Consistent message rendering

A single user message can trigger multiple internal agent turns (think, tool use, think again, respond, tool use, respond again). These are presented as a single coherent assistant message regardless of when the user views the conversation.

### During live streaming

- [ ] All text the agent produces across all turns within one exchange is collected into a single assistant message bubble, with turn boundaries separated by blank lines

### When returning to a conversation

- [ ] Chat history from the Agent SDK transcript is collapsed before display: consecutive assistant messages (from multi-turn agent work) are merged into a single message, joined with blank line separators
- [ ] The result is visually identical to what the user would have seen live — one assistant bubble per user message, not one per internal agent turn
- [ ] Empty assistant messages (turns that only used tools without producing text) are excluded

## Session event stream

Each streaming session broadcasts its events (thinking deltas, text deltas, tool use, results) through an in-memory pub/sub channel keyed by session ID. Any number of subscribers can tap into the stream for a given session.

- [ ] The agent session route publishes every SSE event it sends to the client into the session's pub/sub channel, in addition to writing it to the original response stream
- [ ] A dedicated SSE endpoint (`/api/sessions/[id]/events`) allows clients to subscribe to the live event stream for a session. If the session is not currently streaming, the endpoint sends a single `idle` event and closes. If the session is streaming, it streams events in real time until the session completes, then closes
- [ ] The endpoint requires authentication and verifies the user owns the session
- [ ] Each channel retains a bounded replay buffer (last 50 events) so that a subscriber connecting mid-stream receives recent context (the current partial assistant message, active tool calls) rather than starting from nothing

## Recovery on return

When a user navigates to a conversation that is actively streaming — whether by clicking a sidebar item, using the browser back button, or opening a new tab — the UI reconnects to the live stream.

- [ ] On mount, `useAgentSession` checks whether the session is currently streaming. It does this by connecting to the session event stream endpoint
- [ ] If the session is streaming, the hook sets `isStreaming` to true and processes incoming events exactly as it does for a locally-initiated stream — thinking deltas populate the thinking buffer, text deltas append to the assistant message, tool use events update active tool calls
- [ ] The replay buffer provides enough recent context to display the current assistant message and thinking state, so the user sees where the agent is at rather than a blank slate
- [ ] Chat history is loaded in parallel. The hook merges: history messages (all complete turns) plus the in-progress assistant message from the live stream. Duplicate messages are deduplicated by ID
- [ ] If the session finishes while the user is watching, the hook transitions to idle normally

## Sidebar streaming indicator

The sidebar shows which conversations are actively streaming with a pulsing animation on the session title.

- [ ] The sidebar SSE endpoint (`/api/sidebar-events`) continues to broadcast `streaming_start` and `streaming_stop` events as it does today
- [ ] On initial connection (and reconnection after a drop), the sidebar SSE endpoint sends the set of currently streaming session IDs as a `streaming_sessions` event, so the client starts with correct state rather than an empty set
- [ ] The client merges this initial set with any subsequent start/stop events
- [ ] If the SSE connection drops and reconnects, the client replaces its streaming set with the fresh initial set from the server

## Stale streaming cleanup

Server crashes, redeploys, and network failures can leave sessions marked as streaming when no agent is actually running. The system detects and cleans up these orphaned states.

- [ ] On application startup, the server clears `streamingStartedAt` for all sessions where the timestamp is older than 10 minutes
- [ ] The sidebar SSE endpoint, when building the initial `streaming_sessions` set, excludes sessions with a `streamingStartedAt` older than 10 minutes and clears them
- [ ] The session event stream endpoint, if asked about a session whose `streamingStartedAt` is stale, clears it and returns `idle`

## Pre-stream visual feedback

Between the user pressing send and the first event arriving from the server, the UI provides immediate feedback so the user knows their message was received and the agent is starting up.

- [ ] When the user sends a message, `isStreaming` is set to true and an empty assistant placeholder message is appended immediately — before the HTTP request is made
- [ ] This triggers the thinking indicator ("Thinking..." with pulsing dot) within the same render frame as the message send
- [ ] If the HTTP request fails, the placeholder is replaced with an error message and `isStreaming` is set to false
