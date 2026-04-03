---
title: AI card creation
area: workflow
---

Creating a new card or starting a conversation begins from a single unified modal, accessed via the [+] button in the sidebar. The modal has one text input and two submit actions: one to start a conversation (default), and one to create a card directly. Both paths use the same natural-language input.

## Unified creation modal

The [+] button in the sidebar opens a modal with a single text area and two submit actions embedded in the input's bottom bar.

```
┌─────────────────────────────────────────────┐
│                                         [×] │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  What's on your mind?               │    │
│  │                                     │    │
│  │                                     │    │
│  ├─────────────────────────────────────┤    │
│  │  [→]                          [☐+]  │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

- [ ] The modal opens centred with a backdrop overlay, matching existing modal styling (480px max-width, surface background, lg radius, lg shadow)
- [ ] The text area placeholder reads "What's on your mind?"
- [ ] The text area supports multi-line input (Shift+Enter for newlines)
- [ ] Attachments are supported (paste or upload) — shown as previews below the text area, above the action bar
- [ ] The input's bottom bar contains two actions, left and right:
  - **Start chat** (`ArrowRight` icon, left side) — submits the text as the first message of a new conversation
  - **Create card** (`SquarePlus` icon, right side) — submits the text to AI for card generation
- [ ] Tooltip on the chat button: "Start conversation (↵)"
- [ ] Tooltip on the card button: "Create card (⌘↵)"

## Start chat path (default, Enter)

- [ ] Enter submits via the "Start chat" action
- [ ] Creates a new standalone conversation session with the input as the first user message
- [ ] Navigates to the conversation view (`/:projectSlug/sessions/:sessionId`)
- [ ] The modal closes and the conversation loads with the AI's first response streaming
- [ ] If the conversation later reveals work to be done, the AI can suggest creating a card (see `conversation-sessions.md` for auto-card creation)

## Create card path (Cmd+Enter)

- [ ] Cmd+Enter (or clicking the card icon) submits via the "Create card" action
- [ ] The user's typed input is used exactly as the card title — no AI rewriting or modification
- [ ] The input is sent to the AI to generate the card description only
- [ ] While generating, the card button shows a spinner and both buttons are disabled
- [ ] The modal backdrop is non-dismissable while generating
- [ ] The team is assigned automatically (first available team in the project) — no team selector is shown
- [ ] Once generation completes, the card is created and the user is navigated to the card workspace
- [ ] The generated description is one to three sentences summarising the intent, written in the system voice
- [ ] Australian/NZ English spelling is used in generated content

## Keyboard interaction

- [ ] Enter submits as "Start chat" (the primary/default action)
- [ ] Shift+Enter inserts a newline
- [ ] Cmd+Enter submits as "Create card" (the secondary action)
- [ ] Escape closes the modal (when not busy)

## Fallback behaviour

- [ ] If AI description generation fails when creating a card, the full input is used as the description
- [ ] The user can always edit the title and description after creation on the card view

## Sidebar integration

- [ ] The [+] button in the sidebar opens this modal from any page
- [ ] After creating a card or starting a conversation, the sidebar's Recent section updates to show the new entry
- [ ] The modal is a global component, not tied to the board page

## Relationship to other card creation paths

- [ ] The sidebar [+] button uses this unified modal — one text area, two submit actions
- [ ] The spec explorer's edit and "New spec" buttons use the quick-card flow — placeholder "Untitled spec" title, navigates to the spec editor (see `spec-explorer.md`)
- [ ] Both paths produce the same card entity with the same WH-XXX identifier format
