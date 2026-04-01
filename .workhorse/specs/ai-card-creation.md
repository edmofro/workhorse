---
title: AI card creation
area: workflow
---

Creating a new card or starting a conversation begins from the [+] button on sidebar sections. The Cards section's [+] opens a modal defaulting to card creation; the Conversations section's [+] opens the same modal defaulting to chat. The modal has one text input and two submit actions.

## Unified creation modal

The [+] button on the Cards or Conversations section opens a modal with a single text area and two submit actions embedded in the input's bottom bar.

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

## Entry points

- [ ] **Cards [+]** — opens the modal. Default keyboard submit (Enter) creates a card; Cmd+Enter starts a chat. The primary action is reversed compared to Conversations [+]
- [ ] **Conversations [+]** — opens the modal. Default keyboard submit (Enter) starts a chat; Cmd+Enter creates a card
- [ ] Both entry points open the same modal component; only the default action differs based on context

## Start chat path

- [ ] Creates a new standalone conversation session with the input as the first user message
- [ ] Navigates to the conversation view (`/:projectSlug/sessions/:sessionId`)
- [ ] The modal closes and the conversation loads with the AI's first response streaming
- [ ] If the conversation later reveals work to be done, the AI can suggest creating a card (see `conversation-sessions.md` for auto-card creation)

## Create card path

- [ ] The input is sent to the AI to generate a card title and description
- [ ] While generating, the active button shows a spinner and both buttons are disabled
- [ ] The modal backdrop is non-dismissable while generating
- [ ] The team is assigned automatically (first available team in the project) — no team selector is shown
- [ ] Once generation completes, the card is created and the user is navigated to the card workspace
- [ ] The generated title is concise (under 60 characters) and written as a noun phrase (e.g. "Patient allergy tracking", not "Add patient allergy tracking")
- [ ] The generated description is one to three sentences summarising the intent, written in the system voice
- [ ] Australian/NZ English spelling is used in generated content

## Keyboard interaction

- [ ] The default Enter action depends on which section's [+] opened the modal (Cards = create card, Conversations = start chat)
- [ ] The secondary action is always the modifier key variant (Cmd+Enter)
- [ ] Shift+Enter inserts a newline
- [ ] Escape closes the modal (when not busy)

## Fallback behaviour

- [ ] If AI generation fails when creating a card, the card is created with the user's raw input as the title (truncated to 60 characters with ellipsis if needed) and the full input as the description
- [ ] The user can always edit the title and description after creation on the card view

## Other creation paths

- [ ] **Specs [+]** creates a quick card with placeholder title and drops the user into the spec editor — spec-first workflow where the card wraps around the spec
- [ ] **Design [+]** creates a quick card and drops the user into mockup mode — same reverse workflow
- [ ] Both paths produce the same card entity with the same WH-XXX identifier format
