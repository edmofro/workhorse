---
title: AI card creation
area: workflow
status: draft
---

Creating a new card starts with a single free-text prompt describing what the user wants to achieve. The AI generates a title and brief description from this input, then opens the card so the user can refine it and begin the spec interview.

## Card creation flow

- [ ] The "New card" button opens a modal with a single text area and a team selector
- [ ] The text area placeholder reads "Describe what you're wanting to achieve..."
- [ ] The user writes a short natural-language description of the work (one sentence to a paragraph)
- [ ] The user selects which team the card belongs to
- [ ] On submit, the input is sent to the AI to generate a card title and description
- [ ] While the AI is generating, the modal shows a brief loading state
- [ ] Once generation completes, the card is created and the user is navigated to the card's chat tab
- [ ] The generated title is concise (under 60 characters) and written as a noun phrase (e.g. "Patient allergy tracking", not "Add patient allergy tracking")
- [ ] The generated description is one to three sentences summarising the intent, written in the system voice (describes what the system does, not instructions)

## Fallback behaviour

- [ ] If AI generation fails, the card is created with the user's raw input as both the title (truncated if needed) and description
- [ ] The user can always edit the title and description after creation on the Card tab

## What this replaces

- [ ] The previous card creation form with separate title, description, and team fields is replaced by this single-prompt flow
- [ ] The team selector remains — team assignment is not inferred by AI
