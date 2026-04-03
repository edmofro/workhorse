---
title: Agent interrupt and send-while-streaming
card: WH-062
status: draft
---

# Agent interrupt and send-while-streaming

## Overview

The chat input area needs a stop button so users can interrupt a running agent, and support for sending messages while the agent is still working. The input controls use icon-only buttons (up-arrow for send, square for stop) matching the conventions of Claude Code, Linear, and similar tools.

## Input states

The send/stop area has four states:

| State | Text entered | Agent running | Controls shown |
|-------|-------------|---------------|----------------|
| 1. Idle, empty | No | No | Disabled up-arrow |
| 2. Ready to send | Yes | No | Enabled up-arrow |
| 3. Agent working | No | Yes | Stop (square) button |
| 4. Agent working + text | Yes | Yes | Stop button + enabled up-arrow |

## Stop behaviour

### Client side

When the user clicks the stop button:

1. `interrupt()` calls `abortRef.current.abort()`, cancelling the in-flight SSE fetch.
2. Any text already streamed into the assistant message is preserved as-is.
3. If no text was produced, a brief "Stopped." notice is shown as the assistant message.
4. The input becomes available immediately — streaming state resets, stop reverts to send.

### Server side

The API route creates an `AbortController` and passes it to the SDK's `query()` call via the `abortController` option. The controller is wired to `request.signal`, so when the client disconnects (fetch aborted), the SDK's agent loop is also halted — it stops making API calls and running tools. Any file writes already completed are preserved; incomplete writes are discarded by the SDK.

## Send while streaming

When the agent is running and the user types a message and presses send (state 4):

1. The user message appears immediately in the chat history.
2. The message is queued internally.
3. When the current agent turn completes, the queued message is automatically sent as the next turn — no user action required.
4. Only one message can be queued at a time. Sending again while a message is already queued replaces it.

This is implemented at the application layer using a state-based queue in `useAgentSession`. A `useEffect` watches for streaming to stop and dispatches the queued message automatically.

## Scope

- Primary chat input in `CardWorkspace` (full-size layout)
- Compact chat input in `FloatingChat` (panel variant)
- No subagent/skill-level interrupt (subagents are not operational yet)

## Acceptance criteria

- [ ] Stop button (square icon) appears when the agent is streaming
- [ ] Clicking stop immediately cancels the stream and preserves partial output
- [ ] If no output was produced, "Stopped." is shown as the assistant message
- [ ] Send button is an up-arrow icon, not a text label
- [ ] User can type and send a message while the agent is working
- [ ] Queued message is sent automatically when the current turn ends
- [ ] All four input states render correctly
- [ ] Works in both full-size and compact chat layouts
