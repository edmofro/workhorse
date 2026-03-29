---
title: Card navigation and chat-first workflow
area: cards
card: WH-006
status: in-progress
---

The card detail experience is rebuilt around a chat-first workflow following the Claude/ChatGPT artifact pattern. The chat is the primary interaction surface — centred when no spec is open, sliding left when a spec opens as an artifact on the right. Specs and mockups are artifacts produced by or referenced by the conversation. The card's status shapes what actions are prominent and what the AI focuses on, but never gates access to any view.

## Mental model

A card is a workspace. The chat is how you interact with the AI about it. Specs and mockups are artifacts that open alongside the chat — chat on the left, artifact on the right, exactly like Claude's artifact panel or ChatGPT's canvas. When no artifact is open, the chat is centred and a small specs panel on the right lists what's been created (like Claude's "Artifacts" sidebar).

The workspace has three primary modes, each using the full content area (no floating panels):

1. **Card home** — card details centred, input bar + pills at the bottom
2. **Chat** — centred conversation (~680px), specs panel on the right
3. **Chat + artifact** — chat left (~40%), spec/mockup right (~60%)

Within the artifact view, a **focus mode** hides the chat and replaces it with a spec navigation rail for reviewing and editing files without the AI.

## Card home (landing state)

The default when opening a card. Card details fill the content area, centred. Specs and mockups are listed inline within the card details. An input bar with action pills sits at the bottom to kick off conversation.

- [ ] Card details (title, description, metadata, comments, activity) fill the content area, centred
- [ ] Specs and mockups listed inline within the card details (not a separate panel), with new/updated labels
- [ ] New spec button (+) available in the inline specs list
- [ ] Input bar fixed at the bottom with action pills above it
- [ ] No chat messages shown — just the input bar and pills as a launchpad
- [ ] Clicking a spec opens it in artifact view (chat + spec)
- [ ] Clicking a mockup opens the mockup overlay
- [ ] Sending a message or clicking a pill transitions to full chat

### When returning to a SPECIFYING card

- [ ] Chat history loaded from Agent SDK session transcript on mount (if available)
- [ ] If no history, the input bar shows cold-start pills for resuming
- [ ] Specs and mockups listed inline show files already on the card's branch
- [ ] One click on a pill or message resumes the conversation and transitions to full chat

## Chat mode (centred conversation)

Triggered when the user sends a message from card home. The card details slide away and the chat fills the content area (~680px max-width, centred). A thin specs panel on the right lists the card's artifacts.

- [ ] Chat messages render at 680px max-width, centred in the content area
- [ ] Thin specs panel (~160px) on the right edge lists this card's specs and mockups with new/updated labels — like Claude's "Artifacts" sidebar
- [ ] Specs panel collapses on narrow screens
- [ ] File write notifications from the AI appear inline in the chat as clickable cards (file name + snippet), like Claude's artifact reference cards
- [ ] Clicking a spec in the right panel or an inline notification opens it as an artifact (chat slides left)
- [ ] `←` back arrow returns to card home
- [ ] Suggested action pills visible above the input bar
- [ ] Chat scroll position preserved across view transitions

## Chat + artifact mode (spec open)

Triggered when the user clicks a spec from the chat, the specs panel, or an inline notification. The chat slides left (~40% width), and the spec opens on the right (~60% width) as an artifact.

- [ ] Chat on the left, spec editor on the right — follows the Claude/ChatGPT artifact convention
- [ ] The specs panel disappears (replaced by the artifact itself)
- [ ] The spec is read-only by default
- [ ] AI edits to the spec appear in real time on the right while the user chats on the left

### Spec header bar

The spec header sits at the top of the artifact area:

- [ ] **◀ ▶ arrows**: flip sequentially between this card's specs and mockups
- [ ] **⌄ dropdown**: spec browser (see "Spec dropdown" section below)
- [ ] **⤢ focus toggle**: enters focus mode (hides chat, shows spec rail)
- [ ] **✕ close**: closes the artifact, returns to centred chat. This is a "close", not a "back" — like ChatGPT's canvas close.
- [ ] **Edit button**: enters focus mode with editing enabled on the current spec (shortcut: ⤢ + Edit in one click)

### Transitions from artifact mode

- [ ] ✕ close → centred chat (specs panel reappears on right)
- [ ] ⤢ focus → focus mode (chat replaced by spec rail)
- [ ] Edit → focus mode + editing (chat replaced by spec rail, spec editable)
- [ ] ◀ ▶ → same mode, different spec
- [ ] Typing in the chat input → stays in artifact mode (chat alongside spec)
- [ ] Escape → close artifact (same as ✕)

## Focus mode (spec rail + artifact)

Entered by clicking ⤢ (focus) or Edit in the spec header. The chat column is replaced by a narrow spec navigation rail. The spec takes ~85% of the width. This mode is for working directly with specs — reviewing or editing — without the AI.

### Spec rail

- [ ] Narrow column (~140px) replacing the chat column
- [ ] Lists this card's specs and mockups as clickable items
- [ ] Active file is visually highlighted
- [ ] Clicking a file in the rail opens it on the right (read-only)
- [ ] No chat input visible — to chat, exit focus mode first

### Reviewing (focus mode, read-only)

- [ ] Spec content displayed read-only at ~85% width
- [ ] Flip between files using the rail, ◀ ▶ arrows, or dropdown
- [ ] No save prompts when flipping — you're just reading
- [ ] Edit button available to enter editing for the current spec
- [ ] Exit focus mode (⤢ toggle again, or Escape) → returns to chat + artifact

### Editing (focus mode, editable)

- [ ] Spec content is editable at ~85% width
- [ ] Spec rail remains visible for navigation context
- [ ] "Done editing" button saves changes and returns the spec to read-only (still in focus mode)
- [ ] Flipping to another spec while editing prompts "Save changes to {filename}?" with Save / Discard options
- [ ] Must exit editing (Done or save via flip prompt) before returning to chat — there is no chat input to type into during editing
- [ ] Can also enter editing by clicking "Edit" from artifact mode (shortcut that does ⤢ + Edit together)

## Mockup view

Triggered when the user clicks a mockup. Full-screen overlay with device toggle, same pattern as current.

- [ ] Full-screen overlay with device toggle (Desktop, Tablet, Mobile) in the topbar
- [ ] Chat as floating pill at bottom centre, expandable to a panel on click
- [ ] ◀ ▶ arrows to flip between mockups
- [ ] ✕ close returns to the previous state
- [ ] Expand button on the floating chat returns to centred chat (closes mockup view)

## State transitions

```
Card home ──(send message / pill)──────────→ Chat (centred)
Card home ──(click spec)───────────────────→ Chat + artifact
Card home ──(click mockup)─────────────────→ Mockup overlay
Card home ──(← back)───────────────────────→ Team board

Chat ──(click spec in panel/notification)──→ Chat + artifact
Chat ──(click mockup)──────────────────────→ Mockup overlay
Chat ──(← back)────────────────────────────→ Card home

Chat + artifact ──(✕ close / Escape)───────→ Chat (centred)
Chat + artifact ──(⤢ focus)────────────────→ Focus mode (read-only)
Chat + artifact ──(Edit)───────────────────→ Focus mode (editing)
Chat + artifact ──(◀ ▶)────────────────────→ Chat + artifact (different file)

Focus mode ──(Edit)────────────────────────→ Focus mode (editing)
Focus mode ──(click file in rail)──────────→ Focus mode (that file, read-only)
Focus mode ──(⤢ toggle / Escape)───────────→ Chat + artifact

Focus editing ──(Done editing)─────────────→ Focus mode (read-only)
Focus editing ──(click other file in rail)─→ Save prompt → Focus mode (other file, read-only)

Mockup overlay ──(✕ close)─────────────────→ Previous state
```

## Spec dropdown (file browser)

Available via the ⌄ chevron in the spec header bar in both artifact and focus modes. This is the primary way to find and open any spec.

- [ ] Search bar at the top, always focused on open
- [ ] Typing instantly filters card specs below by name
- [ ] Simultaneously fires a backend search across all project specs, fuzzy matching on title and content
- [ ] Below search: **This card** section showing card specs/mockups with new/updated labels (always visible, not filtered by search unless search is active)
- [ ] Below that: **All project specs** section showing results from the backend search, or the full list when no search query
- [ ] Clicking a card spec opens it (in current mode — artifact or focus)
- [ ] Clicking a project spec opens it for reading; editing it auto-commits to the card's branch and it appears in the card specs section

## Navigation model

### Back arrow (← in topbar)

- [ ] On card home → navigates to the team board
- [ ] In chat mode → returns to card home
- [ ] In artifact/focus mode → Escape closes the artifact first; ← from chat goes to card home

### Escape key

- [ ] In focus mode → exits to chat + artifact
- [ ] In chat + artifact → closes artifact (same as ✕), returns to centred chat
- [ ] In chat → returns to card home
- [ ] In mockup overlay → closes overlay

### Close (✕) vs back (←)

Close (✕) dismisses the current artifact and returns to centred chat. It's a "close this document" action, not a navigation back. Back (←) navigates up the hierarchy: artifact → chat → card home → board.

## Action pills

Contextual action chips displayed above the chat input bar. Clicking a pill sends a message and triggers a mode-specific system prompt that shapes the AI's behaviour. Always 3–4 pills maximum. The text input is always available beneath the pills for free-form messages.

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

**SPECIFYING, spec open in artifact mode:**
- "Review this spec" — AI reviews the currently-open spec
- "Make changes" — AI follows user's editing directions

**IMPLEMENTING, cold start (future):**
- "Start implementing" — AI begins implementing from specs
- "Design audit" — AI reviews implementation against `.workhorse/design/`
- "Security audit" — AI reviews implementation for security concerns

**IMPLEMENTING, conversation underway (future):**
- "Design audit" — switch to design review mode
- "Security audit" — switch to security review mode
- "Review code" — general code review (only after implementation work; reviews code against spec)

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
- [ ] `useInterview` hook fetches history on mount if `agentSessionId` exists on the card
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
- [ ] The topbar shows: back arrow (context-aware), card title + identifier on the left; Collaborate button on the right
- [ ] `CardDetailShell.tsx` no longer renders a view toggle
- [ ] The floating chat panel (previous iteration) is removed entirely — chat is always column-based
- [ ] `SpecListSidebar.tsx` is replaced by the specs panel (chat mode) and spec rail (focus mode)
- [ ] `RightPanel.tsx` (previous iteration with search + project specs explorer) is replaced by the specs panel + spec dropdown
- [ ] URL routing changes: `/cards/[cardId]` is the only route; view state is client-side

## Open questions

> **Interview complexity threshold:** What determines whether a card is "complex enough" to warrant the interview soft-gate? Number of spec sections? Word count? Presence of open questions? AI-assessed complexity score? This needs definition.

## Resolved decisions

- **URL routing vs client state:** Client-side state. View state is managed via React state in `CardWorkspace`, not URL segments.
- **Pill system prompt injection:** The frontend sends a `mode` parameter alongside the message, and the interview API maps mode to a system prompt fragment server-side.
- **Chat positioning:** Chat is column-based (left side in artifact mode, centred when no artifact), never floating. Follows the Claude/ChatGPT artifact convention.
- **File navigation:** No dedicated navigation panel. Specs panel (thin right-side list in chat mode) for quick access, spec dropdown (⌄ in header bar) with search for finding any spec, spec rail (left column in focus mode) for flipping during review/edit.
- **Spec browsing vs chatting:** They compete for time, not space. The left content column shows either chat or the spec rail, never both. Focus mode replaces chat with the rail; exiting focus mode brings chat back.
- **Edit save model:** Edits are saved explicitly via "Done editing". Flipping to another file while editing prompts save/discard. No auto-save on navigation.
