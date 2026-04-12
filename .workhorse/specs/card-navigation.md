---
title: Card navigation and chat-first workflow
area: cards
card: WH-006
---

The card detail experience is built around a chat-first workflow following the Claude/ChatGPT artifact pattern. The chat is the primary interaction surface — centred when no artifact is open, sliding left when an artifact opens on the right. Specs and mockups are both artifacts produced by or referenced by the conversation, sharing a unified layout. The card's status shapes what actions are prominent and what the AI focuses on, but never gates access to any view.

## Mental model

A card is a workspace. The chat is how you interact with the AI about it. Specs and mockups are artifacts that open alongside the chat — chat on the left, artifact on the right, exactly like Claude's artifact panel or ChatGPT's canvas. When no artifact is open, the chat is centred and the artifacts sidebar on the right lists what's been created.

The workspace has three states, each using the full content area (no floating panels):

1. **Card home** — card details centred, input bar + pills at the bottom. Artifacts sidebar on the right showing specs, mockups, and code changes (always visible, even when empty).
2. **Chat** — centred conversation (~680px), artifacts sidebar on the right (always visible, even when empty). No session title header in the chat zone — the topbar already shows the card context.
3. **Chat + artifact** — chat left (~40%), artifact right (~60%). No sidebar — navigation is via the dropdown, search, and prev/next arrows in the artifact header bar.

Specs and mockups share the same artifact layout. The artifact area renders differently based on file type (rendered markdown vs rendered HTML), but the surrounding chrome — header bar, chat column — is identical.

## Artifacts sidebar

A compact panel (216px, matching the main sidebar width) on the right side of both the **card home** and **chat** views. Always visible — shows all three sections even when they have no files yet, with placeholder text ("No specs yet", "No mockups yet", "No changes yet") to indicate what will appear there as the card progresses.

### Visibility by view state

- [x] **Card home:** sidebar open on the right (216px). Clicking a file opens it in artifact mode with the chat contracted (expanded artifact)
- [x] **Chat (no artifact):** sidebar open on the right (216px). Clicking a file opens it as an artifact (chat slides left)
- [x] **Artifact mode (spec, mockup, or code open):** no sidebar — navigation uses the dropdown, search, and ◀ ▶ arrows in the artifact header bar

### Sidebar sections

The sidebar is divided into three sections with uppercase section labels (following the design system section label style). All three sections are always shown. No heading above the sections — the section labels are self-explanatory.

**Specs**
- [ ] Lists this card's spec files by human-readable label (see `labels.md`)
- [ ] Clicking a spec opens it as an artifact
- [ ] When empty, shows "No specs yet" in faint text

**Mockups**
- [ ] Lists this card's mockup files by human-readable label
- [ ] Clicking a mockup opens it as an artifact
- [ ] When empty, shows "No mockups yet" in faint text

**Code changes**
- [ ] Lists any changed files that aren't specs or mockups — code files changed during implementation
- [ ] Clicking a code file opens it as an artifact
- [ ] Code filenames are shown as-is (raw filename with extension), not sentence-cased — unlike specs and mockups which use human-readable labels
- [ ] Each code file shows a +/− lines changed indicator (e.g. "+42/−7") using diff colours from the design system (`--green` for additions, `--diff-red` for removals). Uses monospace tabular-nums for alignment
- [ ] When empty, shows "No changes yet" in faint text

## Properties bar

A single horizontal bar that sits between the topbar and the content area in all card views — card home, chat, and artifact mode. It shows card metadata and journey status in one persistent strip, so both are always accessible regardless of which view is active.

```
[● Specifying] [High] [Edwin] [Tamanu]  |  [● ● ○ ◌]  Interview  ▾
```

### Properties section

The left side of the bar shows the card's core properties as interactive pills: status, priority, assignee, team.

- [ ] Properties are always shown in the bar, in all card views
- [ ] Each property pill is bare text at rest, gaining a subtle rounded background on hover
- [ ] Clicking a property pill opens a compact dropdown below it
- [ ] The status pill includes a status dot (matching the board column headers and the dot states used throughout the app)
- [ ] Dependency identifiers, if any, are shown as read-only monospace labels after the core properties
- [ ] Changes to properties take effect immediately and are visible to all users in real time

### Journey section

The right side of the bar shows a compact summary of the card's journey. A vertical hairline separates the properties and journey sections when the journey section is visible.

- [ ] The journey section appears only when at least one journal entry exists — on fresh cards with no activity, only the properties section is shown
- [ ] Shows progress dots for the journal: green filled for completed steps, accent filled for the active step, hollow border for scheduled steps, dashed border for jockey suggestions
- [ ] When a step is actively running, the step name appears beside the dots and pulses to indicate activity
- [ ] When no step is currently active (idle), only the dots are shown — no label
- [ ] Clicking the journey section opens a compact dropdown for the full journey detail — see `workflow-orchestration.md`

## Card home (landing state)

The default when opening a card. Card details fill the content area, centred. The artifacts sidebar is always visible on the right.

- [ ] Card details (title, description, metadata, comments, activity) fill the content area, centred
- [ ] Specs, mockups, and code changes are shown in the right sidebar — not inline in the body
- [ ] Input bar fixed at the bottom with action pills above it
- [ ] No chat messages shown — just the input bar and pills as a launchpad
- [ ] Clicking a spec, mockup, or code file in the sidebar opens it in artifact view with the artifact expanded (chat contracted)
- [ ] Sending a message or clicking a pill transitions to full chat

### When returning to a SPECIFYING card

- [ ] Chat history loaded from Agent SDK session transcript on mount (if available)
- [ ] If no history, the input bar shows cold-start pills for resuming
- [ ] Specs and mockups listed inline show files already on the card's branch
- [ ] One click on a pill or message resumes the conversation and transitions to full chat

## Chat mode (centred conversation)

Triggered when the user sends a message from card home. The card details slide away and the chat fills the content area (~680px max-width, centred). The artifacts sidebar is open on the right. No session title header in the chat zone — the topbar already provides card context.

- [ ] Chat messages render at 680px max-width, centred in the content area
- [ ] Artifacts sidebar open on the right (216px), showing Specs, Mockups, and Code changes sections (always visible, even when empty)
- [ ] File write notifications from the AI appear inline in the chat as clickable cards (human-readable label + snippet; see labels.md), like Claude's artifact reference cards
- [ ] Clicking a file in the artifacts sidebar or an inline notification opens it as an artifact (chat slides left, sidebar disappears)
- [ ] `←` back arrow returns to card home
- [ ] Suggested action pills visible above the input bar
- [ ] Chat scroll position preserved across view transitions

## Chat + artifact mode (unified spec/mockup view)

Triggered when the user clicks a spec, mockup, or code file from the chat, the artifacts sidebar, or an inline notification. The chat slides left (~40% width), and the artifact opens on the right (~60% width). The artifacts sidebar is not shown — navigation uses the dropdown, search, and ◀ ▶ arrows in the artifact header bar.

Specs, mockups, and code files use this same layout. The artifact area renders differently based on file type, but the surrounding chrome is identical.

- [ ] Chat on the left, artifact on the right — follows the Claude/ChatGPT artifact convention
- [ ] No sidebar in artifact mode — use the header bar controls (dropdown, search, ◀ ▶) for navigation
- [ ] Artifacts are read-only by default (specs, mockups, and code)
- [ ] AI edits to the artifact appear in real time on the right while the user chats on the left

### Spec artifact

When a spec (.md) is open:

- [ ] **Changes toggle** (File / Changes) in the header bar, defaults to **Changes**
- [ ] **Changes view:** inline tracked-changes diff (like Google Docs / Slab) — additions highlighted in green, removals struck through in red. Uses diff colours from the design system. Intended for product people, not developers — no line numbers, no code diff layout.
- [ ] **File view:** rendered markdown view (read-only by default)
- [ ] Edit button makes it editable in-place (switches to File view if in Changes view) — no layout change, chat stays visible
- [ ] Toggle between rich view and raw markdown view when in File view
- [ ] "Done editing" button returns to read-only and triggers auto-commit (see `commit-specs.md`)

### Mockup artifact

When a mockup (.html) is open:

- [ ] Rendered HTML preview (read-only by default) — no changes toggle for mockups
- [ ] Device toggle in the header bar (Desktop, Tablet, Mobile) to switch aspect ratios
- [ ] Edit button enters split view: preview on top, editor panel on bottom (see `visual-mockups.md` for detail)
- [ ] "Done editing" returns to preview-only and triggers auto-commit

### Code artifact

When a code file (.tsx, .ts, .py, etc.) is open:

- [ ] **Changes toggle** (File / Changes) in the header bar, defaults to **Changes**
- [ ] **Changes view:** unified diff view (like GitHub) with line numbers, colour-coded additions/deletions, and sticky hunk headers. Uses diff colours from the design system.
- [ ] **File view:** plain code view with line numbers (read-only by default)
- [ ] Edit button makes it editable in-place (switches to File view if in Changes view) — provides a plain textarea code editor
- [ ] "Done editing" triggers auto-commit
- [ ] File path shown in the header bar — raw filename with extension, not sentence-cased

### Expanding the artifact (mockups)

Mockups sometimes need more screen space than specs. The chat column can collapse to make room:

- [ ] An expand icon in the artifact header bar collapses the chat column to a single icon on the left edge
- [ ] The artifact fills the full content width (minus the icon strip)
- [ ] Clicking the icon restores the chat column to its normal ~40% width
- [ ] This is available for both specs and mockups, but primarily useful for mockups at desktop aspect ratios

### Artifact header bar

The header sits at the top of the artifact area. Identical chrome for specs, mockups, and code, with type-specific additions:

- [ ] **◀ ▶ arrows**: flip sequentially between this card's specs, mockups, and code files
- [ ] **⌄ dropdown**: file browser (see "File dropdown" section below)
- [ ] **File / Changes toggle** (specs and code only): switches between the file content view and the changes diff view. Defaults to Changes. Not shown for mockups.
- [ ] **Edit button**: makes the artifact editable in-place (no layout change). Switches to File view if currently in Changes view.
- [ ] **✕ close**: closes the artifact, returns to centred chat
- [ ] **Device toggle** (mockups only): Desktop, Tablet, Mobile
- [ ] **Expand icon** (optional): collapses chat to icon, giving the artifact full width

### File switching

When the user opens a different file (via ◀ ▶, dropdown, or artifacts sidebar):

- [ ] If not editing: the new file opens immediately, replacing the current artifact (read-only)
- [ ] If editing: a save prompt appears — "Save changes to {filename}?" with Save / Discard options. After resolving, the new file opens in read-only mode
- [ ] The user clicks Edit again if they want to edit the new file
- [ ] File type can change on switch (spec → mockup or vice versa) — the artifact area re-renders for the new type

### Transitions from artifact mode

- [ ] ✕ close → centred chat (artifacts sidebar reappears)
- [ ] Edit → same layout, artifact becomes editable
- [ ] Done editing → same layout, artifact returns to read-only
- [ ] ◀ ▶ → same mode, different file (with save prompt if editing)
- [ ] Typing in the chat input → stays in artifact mode (chat alongside artifact)
- [ ] Escape → close artifact (same as ✕)
- [ ] Expand → chat collapses to icon, artifact goes full-width
- [ ] Collapse (from expanded) → chat column restores

## State transitions

```
Card home ──(send message / pill)──────────→ Chat (centred, artifacts sidebar stays)
Card home ──(click file in sidebar)────────→ Chat + artifact (expanded, chat contracted)
Card home ──(← back)───────────────────────→ Team board

Chat ──(click file in sidebar/notification)→ Chat + artifact (sidebar disappears)
Chat ──(← back)────────────────────────────→ Card home

Chat + artifact ──(✕ close / Escape)───────→ Chat (centred, artifacts sidebar reappears)
Chat + artifact ──(Edit)───────────────────→ Chat + artifact (editable)
Chat + artifact ──(Done editing)───────────→ Chat + artifact (read-only)
Chat + artifact ──(◀ ▶ / file switch)──────→ Chat + artifact (different file, save prompt if editing)
Chat + artifact ──(Expand)─────────────────→ Expanded artifact (chat as icon)

Expanded artifact ──(Collapse)─────────────→ Chat + artifact
Expanded artifact ──(✕ close / Escape)─────→ Chat (centred, artifacts sidebar reappears)
```

## File dropdown (file browser)

Available via the ⌄ chevron in the artifact header bar. The primary way to find and open any spec or mockup while in artifact mode (where the artifacts sidebar is not visible).

- [ ] Search bar at the top, always focused on open
- [ ] Typing instantly filters card files below by name
- [ ] Simultaneously fires a backend search across all project specs, fuzzy matching on title and content
- [ ] Below search: **This card** section showing card specs, mockups, and code files (always visible, not filtered by search unless search is active). Code files show raw filenames (not sentence-cased) and +/− lines changed indicators
- [ ] Below that: **All project specs** section showing results from the backend search, or the full list when no search query
- [ ] Clicking a card file opens it (replacing the current artifact, with save prompt if editing)
- [ ] Clicking a project spec opens it for reading; editing it auto-commits to the card's branch and it appears in the card files section

## Navigation model

### Back arrow (← in topbar)

- [x] On card home → navigates to the team board (Link to project page)
- [x] In chat mode → returns to card home (in-page navigation via view state, not a route change)
- [x] In artifact mode → returns to card home (closes artifact and chat, returns to card home via view state)

### Escape key

- [ ] In chat + artifact → closes artifact (same as ✕), returns to centred chat
- [ ] In chat → returns to card home

### Close (✕) vs back (←)

Close (✕) dismisses the current artifact and returns to centred chat. It's a "close this document" action, not a navigation back. Back (←) navigates up the hierarchy: chat → card home → board.

## Action pills

Contextual action chips displayed above the chat input bar. Clicking a pill sends a message and triggers the corresponding skill (see `workflow-orchestration.md`). Always 2–4 pills maximum. The text input is always available beneath the pills for free-form messages.

Pills send a visible message (the user sees it in the chat) but also carry a hidden system prompt fragment that reorients the AI. For example, clicking "Review specs" sends a message like "Review specs" but the API prepends review-specific instructions.

- [ ] Pills are generated by the jockey (see `workflow-orchestration.md`) based on the card's journal, conversation state, and open artifacts
- [ ] Each pill maps to a skill, which maps to a system prompt fragment
- [ ] The jockey updates pill suggestions on every message — pills are always relevant to what's happening right now
- [ ] Pills may differ from the journey section's suggested steps — pills are branching options for the immediate moment, not the expected sequence
- [ ] Pill labels are short and direct — 2–4 words maximum. Use verb + noun form: "Draft spec", "Review spec", "Continue", "Update spec". Never use verbose phrases like "Compare code changes against specs"

## Chat history retrieval

Chat messages are currently ephemeral (React state only). Implement retrieval from the Agent SDK session transcript so that returning users see their conversation history.

- [ ] New API endpoint that calls `getSessionMessages(sessionId)` and returns the transcript
- [ ] `useInterview` hook fetches history on mount if `agentSessionId` exists on the card
- [ ] Messages render in the chat above the pills on load
- [ ] Graceful degradation: if retrieval fails or no session exists, show the cold-start pills without history
- [ ] Chat history is read-only context — new messages append below

## Quality gates

Soft gates inform the user when they try to advance a card's status. They check the card's journal (see `workflow-orchestration.md`) for whether relevant skills have run.

- [ ] When the user advances status, check the journal for expected completed skills (e.g. spec review before moving to implementation)
- [ ] If a relevant skill has not run, prompt the user with the option to run it or skip
- [ ] All gates are skippable — the user always has the final say

## Topbar

- [ ] Back arrow (context-aware), card title + identifier on the left
- [ ] Handoff button (see `workflow-orchestration.md`) on the right
- [ ] View state is client-side — `/cards/[cardId]` is the only route

## Resolved decisions

- **Pill generation:** Pills are generated by the jockey based on the card's journal and conversation state, not hardcoded by card status.
- **Pill system prompt injection:** The frontend sends a `mode` parameter alongside the message, and the API maps mode to a system prompt fragment server-side.
- **Chat positioning:** Chat is column-based (left side in artifact mode, centred when no artifact). Follows the Claude/ChatGPT artifact convention.
- **File navigation:** Artifacts sidebar (open in chat view only) for quick access, file dropdown (⌄ in header bar) with search for finding any file in artifact mode.
- **Unified artifact model:** Specs and mockups share the same chat + artifact layout. The artifact area renders differently by file type but the chrome is identical.
- **Edit in-place:** Edit makes the artifact editable without any layout change. Chat stays visible.
- **Edit save model:** Edits are saved explicitly via "Done editing". Switching to another file while editing prompts save/discard. Auto-commit on done (see `commit-specs.md`).
- **Mockup expansion:** When a mockup needs more space, the chat column collapses to a single icon. Click to restore.
- **Proactive mockups:** The AI generates mockups proactively during interviews and spec drafting whenever a visual would help, without waiting to be asked.
