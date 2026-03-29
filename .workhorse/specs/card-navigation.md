---
title: Card navigation and chat-first workflow
area: cards
card: WH-006
status: in-progress
---

The card detail experience is rebuilt around an ever-present chat. The chat is the primary interaction surface — always visible, always the same conversation. Specs and mockups are views you open from within the card workspace, not destinations you navigate to via tabs. The card's status shapes what actions are prominent and what the AI focuses on, but never gates access to any view.

## Mental model

A card is a workspace. The chat is how you interact with the AI about it. Everything the AI produces — specs, mockups — appears in a persistent file panel and can be opened alongside the chat. The three-tab navigation (Card / Chat / Spec) is replaced by a fluid system where the chat grows, shrinks, and repositions based on what you're doing.

The file panel on the right shows files this card has changed (driven by `git diff --name-only main` under the hood). When the AI edits a project spec that overlaps with the card's work, that file automatically appears in the panel. No "attach" action — editing a file is what makes it show up.

## Card view (home state)

The default when opening a card. Card details fill the content area (title, description, metadata, comments, activity). A floating chat panel sits in the lower portion. The right panel lists changed files (specs and mockups).

- [ ] Card details (title, description, metadata, comments, activity) fill the main content area
- [ ] Floating chat panel in the lower portion of the content area, overlaying the card content
- [ ] Chat panel shows recent messages (retrieved from Agent SDK session history) and suggested action pills
- [ ] Chat input bar always visible at the bottom of the floating panel
- [ ] Right panel (220px, collapsible) lists specs and mockups this card has changed
- [ ] Right panel is collapsible via a thin edge toggle; remembers state in localStorage
- [ ] Right panel starts collapsed on screens below 1200px
- [ ] Clicking a spec in the right panel opens the spec view
- [ ] Clicking a mockup in the right panel opens the mockup view

### When returning to a SPECIFYING card

If the card is mid-specifying and the user returns (e.g. after closing the browser), the card view is shown with:

- [ ] Chat history loaded from Agent SDK session transcript (if available)
- [ ] If no history available, the floating chat shows suggested pills for resuming
- [ ] Right panel shows specs and mockups already created on this card's branch
- [ ] One click on a pill or message resumes the conversation and expands to full-screen chat

## Full-screen chat (interview / deep conversation)

Triggered when the user sends a message (via pill or by typing). The card details slide away and the chat expands to fill the content area (680px max-width, centred). The right panel remains. This is where specifying happens — the interview runs here.

- [ ] Chat expands to full-screen on first message sent, like claude.ai's expand-on-first-message pattern
- [ ] Chat messages render at 680px max-width, centred in the content area
- [ ] Right panel stays visible, showing files as they're created/updated in real time
- [ ] Spec and mockup update notifications in the chat are click-through previews: a compact card showing the file name and a snippet of changes, clickable to open the full view
- [ ] Back to card view via breadcrumb, back arrow, or Escape
- [ ] Suggested action pills visible above the input bar (see "Action pills" section)
- [ ] Chat scroll position preserved when switching between views and returning

## Spec view (document open)

Triggered when the user clicks a spec in the right panel or a chat notification. The spec editor opens as the main content. The chat becomes a floating panel at the bottom of the spec editor area. The right panel stays.

- [ ] Spec editor fills the content area (720px max-width, centred within available space)
- [ ] The spec editor has no left sidebar — the right panel handles all file navigation
- [ ] Chat becomes a floating panel at the bottom of the spec editor area, 200px tall by default
- [ ] Floating chat panel is resizable by dragging the top edge
- [ ] Floating chat shows recent messages, suggested pills, and the input bar
- [ ] Expand button (↗ icon) in the floating chat header returns to full-screen chat
- [ ] Close/back affordance on the spec view returns to the previous state (card view or full-screen chat, depending on where the user came from)
- [ ] Closing the spec via the back button and expanding the chat are both ways to exit spec view, but lead to different destinations

## Mockup view (mockup open)

Triggered when the user clicks a mockup in the right panel or a chat notification. The mockup viewer opens as a full-screen overlay with device toggle. The chat becomes a floating pill at the bottom centre, expandable to a panel.

- [ ] Full-screen overlay with device toggle (Desktop, Tablet, Mobile) in the topbar
- [ ] Chat as floating pill at bottom centre, expandable to a panel on click
- [ ] Closing the mockup view returns to the previous state
- [ ] Expand button on the floating chat returns to full-screen chat (closes mockup view)

## State transitions

```
Card view  ──(send message / click pill)──▶  Full-screen chat
Card view  ──(click spec in right panel)──▶  Spec view
Card view  ──(click mockup in right panel)──▶  Mockup view

Full-screen chat  ──(click spec in right panel or notification)──▶  Spec view
Full-screen chat  ──(click mockup in right panel or notification)──▶  Mockup view
Full-screen chat  ──(back / Escape)──▶  Card view

Spec view  ──(expand chat)──▶  Full-screen chat
Spec view  ──(click mockup)──▶  Mockup view
Spec view  ──(close / back)──▶  (previous state: card view or full-screen chat)

Mockup view  ──(close)──▶  (previous state)
Mockup view  ──(expand chat)──▶  Full-screen chat
```

## Right panel

A persistent panel on the right side of the content area, consistent across all views except mockup view (which is a full-screen overlay). Shows the same content everywhere — no adaptive behaviour.

- [ ] Fixed width: 220px
- [ ] Collapsible via thin edge toggle; remembers state in localStorage
- [ ] Starts collapsed on screens below 1200px

### Contents

The panel has three sections: specs and mockups for this card (the user's work), then a project explorer below a separator (browsing what else exists).

- [ ] **Specs** section: files changed on this card's branch within `.workhorse/specs/`, with new/updated labels derived from whether the file exists on main
- [ ] **New spec** button (+ icon) to create a new spec file (opens the NewSpecDialog)
- [ ] Clicking a card spec opens it in the spec view for editing
- [ ] **Mockups** section: mockup files changed on this card's branch within `.workhorse/design/mockups/`
- [ ] Clicking a mockup opens the mockup view
- [ ] Items in both sections appear in real time as the AI creates or updates files during the interview

Below a visual separator:

- [ ] **Search bar**: filters both card specs/mockups above and project specs below by filename
- [ ] **Project specs** section (collapsible, collapsed by default): all specs in the project's main branch, excluding those already changed by this card. Searching auto-expands this section
- [ ] Clicking a project spec opens it in the spec view for reading; editing it auto-commits to the card's branch, which makes it appear in the specs section above

## Action pills

Contextual action chips displayed above the chat input bar. Clicking a pill sends a message and (for most pills) triggers a mode-specific system prompt that shapes the AI's behaviour. Always 3–4 pills maximum. The text input is always available beneath the pills for free-form messages.

Pills send a visible message (the user sees it in the chat) but also carry a hidden system prompt fragment that reorients the AI. For example, clicking "Review specs" sends a message like "Review specs" but the API prepends review-specific instructions.

### Pill sets by context

**NOT_STARTED, cold start:**
- "Interview me" — begins structured interview, AI asks probing questions
- "Draft a spec" — AI generates spec from card description, less interactive

**SPECIFYING, cold start (returning, no chat history):**
- "Where were we up to?" — AI summarises progress and what's left
- "Continue interview" — resumes structured interview
- "Review specs" — fresh-eyes review of current spec state

**SPECIFYING, cold start (returning, with chat history):**
- "Continue interview" — resumes structured interview
- "Review specs" — fresh-eyes review of current spec state

**SPECIFYING, conversation underway:**
- "Interview me" — switch to interview mode (AI asks questions)
- "Review specs" — switch to review mode (AI critiques)
- "Make changes" — switch to directed mode (AI follows instructions)

**SPECIFYING, floating chat in spec view:**
- "Review this spec" — AI reviews the currently-open spec
- "Make changes" — AI follows user's editing directions

**IMPLEMENTING, cold start (future):**
- "Start implementing" — AI begins implementing from specs
- "Design audit" — AI reviews implementation against `.workhorse/design/`
- "Security audit" — AI reviews implementation for security concerns

**IMPLEMENTING, conversation underway (future):**
- "Design audit" — switch to design review mode
- "Security audit" — switch to security review mode
- "Review code" — general code review (only available after implementation work has been done; reviews code against spec, not the spec changes themselves)

### System prompts behind pills

Each pill maps to a system prompt fragment that is prepended to the message when sent via the API. These shape the AI's behaviour without requiring the user to write detailed instructions.

- [ ] **Interview mode**: AI conducts structured interview — asks probing questions, surfaces edge cases, challenges assumptions. Does not accept requirements at face value. Focuses on one or two questions at a time.
- [ ] **Draft spec mode**: AI reads the card description and existing codebase context, then generates a complete spec draft. Less interactive — produces output, then asks for feedback.
- [ ] **Review mode**: AI reads all specs for this card with fresh eyes. Looks for gaps, contradictions, ambiguities, missing edge cases, cross-spec impacts. Systematic and critical.
- [ ] **Directed editing mode**: AI follows the user's specific instructions to make changes to spec files. Action-oriented — does what's asked without unsolicited suggestions.
- [ ] **Design audit mode** (future): AI reviews implementation against `.workhorse/design/` system docs. Checks component usage, spacing, colour palette adherence, interaction patterns.
- [ ] **Security audit mode** (future): AI reviews implementation for OWASP top 10, injection vulnerabilities, auth/authz issues, data exposure, input validation.
- [ ] **Code review mode** (future): AI reviews implementation code against the spec acceptance criteria. Focuses on whether the code correctly implements the spec, not on the spec itself. Only available after implementation work has been committed.

## Chat history retrieval

Chat messages are currently ephemeral (React state only). Implement retrieval from the Agent SDK session transcript so that returning users see their conversation history.

- [ ] New API endpoint that calls `getSessionMessages(sessionId)` and returns the transcript
- [ ] `useAgentSession` hook fetches history on mount if `agentSessionId` exists on the card
- [ ] Messages render in the chat above the pills on load
- [ ] Graceful degradation: if retrieval fails or no session exists, show the cold-start pills without history
- [ ] Chat history is read-only context — new messages append below

## Quality step tracking

Track which quality steps have been completed for each card, surfaced as soft gates when the user tries to advance status. These inform — they don't block.

- [ ] Track whether the card has been through a substantive interview (more than N turns of back-and-forth, not just a "draft a spec" one-shot)
- [ ] Track whether a spec review has been completed (fresh-eyes review agent has run)
- [ ] Track whether implementation review agents have run: design audit, security audit, code review (future, for IMPLEMENTING → COMPLETE transition)

### Soft-gate behaviour

- [ ] When the user moves status from SPECIFYING → IMPLEMENTING, check if a spec review has been completed. If not, prompt: "You haven't run a spec review yet. Run one now?" with the option to skip
- [ ] The interview gate is lighter: only surface it if the spec has significant complexity (many sections, open questions remaining, or low completeness assessment). A simple card with a clean spec draft doesn't need an interview
- [ ] When the user moves status from IMPLEMENTING → COMPLETE (future), check if review agents have run. Prompt similarly
- [ ] All gates are skippable — the user always has the final say

## What this replaces

- [ ] The Card / Chat / Spec tab strip in the topbar is removed
- [ ] The topbar shows: back arrow, card title + identifier on the left; Collaborate button on the right (when in SPECIFYING or IMPLEMENTING)
- [ ] `CardDetailShell.tsx` no longer renders a view toggle
- [ ] `ChatSessionView.tsx` becomes the full-screen chat state
- [ ] `SpecTab.tsx` becomes what opens when you click a spec, with the floating chat at the bottom instead of a chat sidebar on the left
- [ ] `SpecListSidebar.tsx` is replaced by the right panel (same data, different position and always-present)
- [ ] `CardTab.tsx` becomes the card view (home state)
- [ ] URL routing changes: `/cards/[cardId]` is the only route; view state (card/chat/spec/mockup) is client-side state, not URL segments

## Open questions

> **Interview complexity threshold:** What determines whether a card is "complex enough" to warrant the interview soft-gate? Number of spec sections? Word count? Presence of open questions? AI-assessed complexity score? This needs definition.

## Resolved decisions

- **URL routing vs client state:** Client-side state. View state (card/chat/spec/mockup) is managed via React state in `CardWorkspace`, not URL segments. Simpler implementation, no deep-linking needed since users always enter via the card view.
- **Floating chat height in card view:** Overlay, not push. The floating chat sits on top of card content. Card content remains fully scrollable underneath.
- **Pill system prompt injection:** Option (a) — the frontend sends a `mode` parameter alongside the message, and the agent session API maps mode to a system prompt fragment server-side. Keeps prompt logic server-side.
