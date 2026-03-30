---
title: AI card creation
area: workflow
status: draft
---

Creating a new card from the board starts with a single free-text prompt describing what the user wants to achieve. The AI generates a title and brief description from this input, then opens the card workspace so the user can begin the spec interview immediately via the chat input bar.

This covers the primary "New card" button on the board. The spec explorer has its own quick-start flow (see `spec-explorer.md`) where cards are created with a placeholder title and the user goes straight to spec editing.

## Card creation flow

- [ ] The "New card" button on the board opens a modal with a single text area and a team selector
- [ ] The text area placeholder reads "Describe what you're wanting to achieve..."
- [ ] The user writes a short natural-language description of the work (one sentence to a paragraph)
- [ ] The user selects which team the card belongs to
- [ ] On submit, the input is sent to the AI to generate a card title and description
- [ ] While the AI is generating, the submit button shows a spinner and "Creating..." label
- [ ] The modal backdrop is non-dismissable while generating
- [ ] Once generation completes, the card is created and the user is navigated to the card workspace
- [ ] The generated title is concise (under 60 characters) and written as a noun phrase (e.g. "Patient allergy tracking", not "Add patient allergy tracking")
- [ ] The generated description is one to three sentences summarising the intent, written in the system voice (describes what the system does, not instructions)
- [ ] Australian/NZ English spelling is used in generated content

## Keyboard interaction

- [ ] Enter submits the form (same as clicking "Create card")
- [ ] Shift+Enter inserts a newline in the text area

## Fallback behaviour

- [ ] If AI generation fails, the card is created with the user's raw input as the title (truncated to 60 characters with ellipsis if needed) and the full input as the description
- [ ] The user can always edit the title and description after creation on the card view

## Relationship to other card creation paths

- [ ] The board's "New card" button uses this AI-prompt flow — one text area, AI-generated title and description, navigates to card workspace
- [ ] The spec explorer's edit and "New spec" buttons use the quick-card flow — placeholder "Untitled spec" title, navigates to the spec editor (see `spec-explorer.md`)
- [ ] Both paths produce the same card entity with the same WH-XXX identifier format
