---
title: Interrupt AI agent
area: agent
card: WH-062
---

While the AI agent is running, the user can stop it or queue a follow-up message without waiting for the agent to finish.

## Input states

The chat input area reflects the current state of the agent and the input field:

| Input text | Agent running | State |
|---|---|---|
| Empty | No | Up arrow button, disabled |
| Text entered | No | Up arrow button, enabled |
| Empty | Yes | Stop button only |
| Text entered | Yes | Stop button + up arrow |

The up arrow button is an icon button (no label). The stop button is a square icon button (no label).

## Stop button

- [ ] While the agent is processing, a stop button appears in the chat input area
- [ ] The stop button is visible regardless of whether text is entered in the input field
- [ ] Clicking stop cancels the client's connection to the agent stream — from the user's perspective, the agent stops immediately. The server-side agent turn may continue briefly in the background; any file changes it makes will be auto-committed as normal
- [ ] Any text the agent produced before the stop remains visible in the conversation as a complete assistant message — it is not removed or collapsed
- [ ] The progress indicator and thinking snippets disappear immediately on stop
- [ ] If the agent produced no text output before the stop, a brief inline notice appears in place of the empty assistant message: "Stopped." — no other explanation

## Queued send

- [ ] While the agent is processing, the input field accepts text normally
- [ ] When text is entered while the agent is running, the send button (up arrow) appears alongside the stop button
- [ ] Clicking send while the agent is running queues the message — it is held and delivered as the next turn automatically when the current agent run completes
- [ ] A subtle visual treatment on the input or the send button indicates the message is queued (e.g. muted send button colour), so the user knows it hasn't been sent yet
- [ ] If the user clicks stop while a message is queued, the queued message is discarded — the user is back in the normal idle state with their typed text still in the input field

## Post-interrupt state

- [ ] After stopping, the chat input is immediately available
- [ ] The stop button reverts to the standard up arrow send button
- [ ] The user can edit, send, or clear the input as normal

## Cross-references

- `agent-sdk-session.md` — streaming UI, progress indicator, and auto-commit model that interruption integrates with
