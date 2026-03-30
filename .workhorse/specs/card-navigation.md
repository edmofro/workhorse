---
title: Card navigation and chat-first workflow
area: cards
card: WH-006
status: in-progress
---

The card detail experience is built around a chat-first workflow following the Claude/ChatGPT artifact pattern. The chat is the primary interaction surface — centred when no artifact is open, sliding left when an artifact opens on the right. Specs and mockups are both artifacts produced by or referenced by the conversation, sharing a unified layout. The card's status shapes what actions are prominent and what the AI focuses on, but never gates access to any view.

## Mental model

A card is a workspace. The chat is how you interact with the AI about it. Specs and mockups are artifacts that open alongside the chat — chat on the left, artifact on the right, exactly like Claude's artifact panel or ChatGPT's canvas. When no artifact is open, the chat is centred and the files panel on the right lists what's been created.

The workspace has three states, each using the full content area (no floating panels):

1. **Card home** — card details centred, files panel on the right, input bar + pills at the bottom
2. **Chat** — centred conversation (~680px), files panel on the right
3. **Chat + artifact** — chat left (~40%), artifact right (~60%), files panel collapsed on the right edge

Specs and mockups share the same artifact layout. The artifact area renders differently based on file type (rendered markdown vs rendered HTML), but the surrounding chrome — header bar, files panel, chat column — is identical.

## Files panel

A thin panel (~180px) on the right edge listing this card's specs and mockups. Present in every view state, with different default visibility. Uses human-readable labels (see `labels.md`).

### Behaviour by view state

- [ ] **Card home:** open by default, can be collapsed
- [ ] **Chat (no artifact):** open by default, can be collapsed
- [ ] **Artifact (spec or mockup open):** collapsed by default, hover to peek
- [ ] Consistent position and appearance across all states — same panel, same content, same interactions

### Collapsed state (artifact mode)

- [ ] A narrow collapsed indicator on the right edge of the artifact area (subtle, not intrusive)
- [ ] Hovering over the indicator pops the panel out as an **overlay** on top of the artifact content, from the right edge
- [ ] The overlay has a solid background (not transparent) so file names are readable over the artifact
- [ ] Clicking a file in the hover panel opens that file (see "File switching" below) and the panel returns to collapsed
- [ ] Moving the mouse away from the panel collapses it back
- [ ] No pinning — hover and select is sufficient. No content shifts when the panel appears or disappears

### Open state (card home and chat)

- [ ] Panel is visible by default alongside the content area
- [ ] Collapsible via a small toggle (e.g. a chevron or sidebar icon in the panel header)
- [ ] When collapsed in these views, the panel becomes the same hover-to-peek indicator as in artifact mode

### Panel contents

- [ ] Lists this card's specs and mockups together, grouped by type (specs first, mockups below)
- [ ] Each item shows: human-readable label (see `labels.md`), new/updated indicator
- [ ] Active file is visually highlighted when an artifact is open
- [ ] "+" button at the top or within each section for creating new specs (new mockups are created via chat)
- [ ] Clicking a spec or mockup opens it as an artifact

## Card home (landing state)

The default when opening a card. Card details fill the content area, centred. The files panel is open on the right.

- [ ] Card details (title, description, metadata, comments, activity) fill the content area, centred
- [ ] Specs and mockups listed inline within the card details with new/updated labels
- [ ] New spec button (+) available in the inline specs list
- [ ] Input bar fixed at the bottom with action pills above it
- [ ] No chat messages shown — just the input bar and pills as a launchpad
- [ ] Clicking a spec or mockup opens it in artifact view (chat + artifact)
- [ ] Sending a message or clicking a pill transitions to full chat
- [ ] Files panel open on the right by default

### When returning to a SPECIFYING card

- [ ] Chat history loaded from Agent SDK session transcript on mount (if available)
- [ ] If no history, the input bar shows cold-start pills for resuming
- [ ] Specs and mockups listed inline show files already on the card's branch
- [ ] One click on a pill or message resumes the conversation and transitions to full chat

## Chat mode (centred conversation)

Triggered when the user sends a message from card home. The card details slide away and the chat fills the content area (~680px max-width, centred). The files panel remains open on the right.

- [ ] Chat messages render at 680px max-width, centred in the content area
- [ ] Files panel open on the right (same panel as card home, same ~180px width)
- [ ] Files panel collapses on narrow screens
- [ ] File write notifications from the AI appear inline in the chat as clickable cards (human-readable label + snippet; see labels.md), like Claude's artifact reference cards
- [ ] Clicking a file in the files panel or an inline notification opens it as an artifact (chat slides left)
- [ ] `←` back arrow returns to card home
- [ ] Suggested action pills visible above the input bar
- [ ] Chat scroll position preserved across view transitions

## Chat + artifact mode (unified spec/mockup view)

Triggered when the user clicks a spec or mockup from the chat, the files panel, or an inline notification. The chat slides left (~40% width), and the artifact opens on the right (~60% width). The files panel collapses to its hover-to-peek state on the right edge of the artifact.

Specs and mockups use this same layout. The artifact area renders differently based on file type, but the surrounding chrome is identical.

- [ ] Chat on the left, artifact on the right — follows the Claude/ChatGPT artifact convention
- [ ] Files panel collapses to its hover indicator on the right edge
- [ ] Artifacts are read-only by default (both specs and mockups)
- [ ] AI edits to the artifact appear in real time on the right while the user chats on the left

### Spec artifact

When a spec (.md) is open:

- [ ] Rendered markdown view (read-only by default)
- [ ] Edit button makes it editable in-place — no layout change, chat stays visible
- [ ] Toggle between rich view and raw markdown view
- [ ] "Done editing" button returns to read-only and triggers auto-commit (see `commit-specs.md`)

### Mockup artifact

When a mockup (.html) is open:

- [ ] Rendered HTML preview (read-only by default)
- [ ] Device toggle in the header bar (Desktop, Tablet, Mobile) to switch aspect ratios
- [ ] Edit button enters split view: preview on top, editor panel on bottom (see `visual-mockups.md` for detail)
- [ ] "Done editing" returns to preview-only and triggers auto-commit

### Expanding the artifact (mockups)

Mockups sometimes need more screen space than specs. The chat column can collapse to make room:

- [ ] An expand icon in the artifact header bar collapses the chat column to a single icon on the left edge
- [ ] The artifact fills the full content width (minus the icon strip)
- [ ] Clicking the icon restores the chat column to its normal ~40% width
- [ ] The files panel hover-to-peek continues to work in expanded mode
- [ ] This is available for both specs and mockups, but primarily useful for mockups at desktop aspect ratios

### Artifact header bar

The header sits at the top of the artifact area. Identical chrome for specs and mockups, with type-specific additions:

- [ ] **◀ ▶ arrows**: flip sequentially between this card's specs and mockups
- [ ] **⌄ dropdown**: file browser (see "File dropdown" section below)
- [ ] **Edit button**: makes the artifact editable in-place (no layout change)
- [ ] **✕ close**: closes the artifact, returns to centred chat
- [ ] **Device toggle** (mockups only): Desktop, Tablet, Mobile
- [ ] **Expand icon** (optional): collapses chat to icon, giving the artifact full width

### File switching

When the user opens a different file (via ◀ ▶, files panel, or dropdown):

- [ ] If not editing: the new file opens immediately, replacing the current artifact (read-only)
- [ ] If editing: a save prompt appears — "Save changes to {filename}?" with Save / Discard options. After resolving, the new file opens in read-only mode
- [ ] The user clicks Edit again if they want to edit the new file
- [ ] File type can change on switch (spec → mockup or vice versa) — the artifact area re-renders for the new type

### Transitions from artifact mode

- [ ] ✕ close → centred chat (files panel reopens)
- [ ] Edit → same layout, artifact becomes editable
- [ ] Done editing → same layout, artifact returns to read-only
- [ ] ◀ ▶ → same mode, different file (with save prompt if editing)
- [ ] Typing in the chat input → stays in artifact mode (chat alongside artifact)
- [ ] Escape → close artifact (same as ✕)
- [ ] Expand → chat collapses to icon, artifact goes full-width
- [ ] Collapse (from expanded) → chat column restores

## State transitions

```
Card home ──(send message / pill)──────────→ Chat (centred)
Card home ──(click spec or mockup)─────────→ Chat + artifact
Card home ──(← back)───────────────────────→ Team board

Chat ──(click file in panel/notification)──→ Chat + artifact
Chat ──(← back)────────────────────────────→ Card home

Chat + artifact ──(✕ close / Escape)───────→ Chat (centred, files panel reopens)
Chat + artifact ──(Edit)───────────────────→ Chat + artifact (editable)
Chat + artifact ──(Done editing)───────────→ Chat + artifact (read-only)
Chat + artifact ──(◀ ▶ / file switch)──────→ Chat + artifact (different file, save prompt if editing)
Chat + artifact ──(Expand)─────────────────→ Expanded artifact (chat as icon)

Expanded artifact ──(Collapse)─────────────→ Chat + artifact
Expanded artifact ──(✕ close / Escape)─────→ Chat (centred)
```

## File dropdown (file browser)

Available via the ⌄ chevron in the artifact header bar. The primary way to find and open any spec or mockup beyond what's listed in the files panel.

- [ ] Search bar at the top, always focused on open
- [ ] Typing instantly filters card files below by name
- [ ] Simultaneously fires a backend search across all project specs, fuzzy matching on title and content
- [ ] Below search: **This card** section showing card specs and mockups with new/updated labels (always visible, not filtered by search unless search is active)
- [ ] Below that: **All project specs** section showing results from the backend search, or the full list when no search query
- [ ] Clicking a card file opens it (replacing the current artifact, with save prompt if editing)
- [ ] Clicking a project spec opens it for reading; editing it auto-commits to the card's branch and it appears in the card files section

## Navigation model

### Back arrow (← in topbar)

- [ ] On card home → navigates to the team board
- [ ] In chat mode → returns to card home
- [ ] In artifact mode → Escape closes the artifact first; ← from chat goes to card home

### Escape key

- [ ] In chat + artifact → closes artifact (same as ✕), returns to centred chat
- [ ] In chat → returns to card home

### Close (✕) vs back (←)

Close (✕) dismisses the current artifact and returns to centred chat. It's a "close this document" action, not a navigation back. Back (←) navigates up the hierarchy: chat → card home → board.

## Action pills

Contextual action chips displayed above the chat input bar. Clicking a pill sends a message and triggers a mode-specific system prompt that shapes the AI's behaviour. Always 3–4 pills maximum. The text input is always available beneath the pills for free-form messages.

Pills send a visible message (the user sees it in the chat) but also carry a hidden system prompt fragment that reorients the AI. For example, clicking "Review specs" sends a message like "Review specs" but the API prepends review-specific instructions.

### Pill sets by context

**NOT_STARTED, cold start:**
- "Interview me" — begins structured interview, AI asks probing questions
- "Draft a spec" — AI generates spec from card description, less interactive
- "Add a mockup" — user pastes Figma HTML or describes what they want, AI generates a mockup

**SPECIFYING, cold start (returning, no chat history):**
- "Where were we up to?" — AI summarises progress and what's left
- "Continue interview" — resumes structured interview
- "Review specs" — fresh-eyes review of current spec state
- "Add a mockup" — create a new mockup

**SPECIFYING, cold start (returning, with chat history):**
- "Continue interview" — resumes structured interview
- "Review specs" — fresh-eyes review of current spec state
- "Add a mockup" — create a new mockup

**SPECIFYING, conversation underway:**
- "Interview me" — switch to interview mode (AI asks questions)
- "Review specs" — switch to review mode (AI critiques)
- "Make changes" — switch to directed mode (AI follows instructions)

**SPECIFYING, artifact open:**
- "Review this spec" / "Review this mockup" — AI reviews the currently-open artifact
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

- [ ] **Interview mode**: AI conducts structured interview — asks probing questions, surfaces edge cases, challenges assumptions. Does not accept requirements at face value. Focuses on one or two questions at a time. **Proactively generates mockups** when discussing UI-heavy features — the AI should create mockup HTML files whenever a visual would help illustrate the concept being discussed, without waiting to be asked.
- [ ] **Draft spec mode**: AI reads the card description and existing codebase context, then generates a complete spec draft. Less interactive — produces output, then asks for feedback. **Generates mockups** for any UI-facing specs as part of the draft.
- [ ] **Review mode**: AI reads all specs for this card with fresh eyes. Looks for gaps, contradictions, ambiguities, missing edge cases, cross-spec impacts. Systematic and critical.
- [ ] **Directed editing mode**: AI follows the user's specific instructions to make changes to spec or mockup files. Action-oriented — does what's asked without unsolicited suggestions.
- [ ] **Add mockup mode**: AI asks what the user wants to see, accepts pasted HTML/Figma exports, and generates a clean mockup HTML file in `.workhorse/design/mockups/{card-id}/`. References the design system for consistency.
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
- [ ] `SpecListSidebar.tsx` is replaced by the files panel
- [ ] `RightPanel.tsx` (previous iteration with search + project specs explorer, 240px wide) is replaced by the files panel + file dropdown
- [ ] Focus mode, spec rail, and the ⤢ toggle are removed entirely
- [ ] Mockup full-screen overlay is removed — mockups use the same artifact layout as specs
- [ ] URL routing changes: `/cards/[cardId]` is the only route; view state is client-side

## Open questions

> **Interview complexity threshold:** What determines whether a card is "complex enough" to warrant the interview soft-gate? Number of spec sections? Word count? Presence of open questions? AI-assessed complexity score? This needs definition.

> **Files panel naming:** The thin right-side panel listing specs and mockups needs a good name. "Files panel" is a placeholder — it's functional but uninspired. Candidates: working set, attachments, card files, artifacts. TBD.

## Resolved decisions

- **URL routing vs client state:** Client-side state. View state is managed via React state in `CardWorkspace`, not URL segments.
- **Pill system prompt injection:** The frontend sends a `mode` parameter alongside the message, and the interview API maps mode to a system prompt fragment server-side.
- **Chat positioning:** Chat is column-based (left side in artifact mode, centred when no artifact), never floating. Follows the Claude/ChatGPT artifact convention.
- **File navigation:** Files panel (hover-to-peek in artifact mode, open in chat/home) for quick access, file dropdown (⌄ in header bar) with search for finding any file. No dedicated rail or focus mode.
- **Unified artifact model:** Specs and mockups share the same chat + artifact layout. No separate full-screen mockup overlay. The artifact area renders differently by file type but the chrome is identical.
- **Edit in-place:** Edit makes the artifact editable without any layout change. Chat stays visible. No focus mode, no mode switch. The user stays in artifact mode and the spec or mockup becomes editable.
- **Focus mode removed:** The ⤢ focus toggle, spec rail, and the concept of a mode that hides chat and shows a navigation rail are removed. Editing and file navigation work within the standard artifact layout.
- **Edit save model:** Edits are saved explicitly via "Done editing". Switching to another file while editing prompts save/discard. Auto-commit on done (see `commit-specs.md`).
- **Mockup expansion:** When a mockup needs more space, the chat column collapses to a single icon rather than a narrow strip. Click to restore.
- **Proactive mockups:** The AI generates mockups proactively during interviews and spec drafting whenever a visual would help, without waiting to be asked. Mockups are saved to `.workhorse/design/mockups/{card-id}/`.
