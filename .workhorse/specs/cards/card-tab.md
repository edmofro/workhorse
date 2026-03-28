---
title: Card tab
area: cards
card: WH-016
status: draft
---

Each card has a Card tab that serves as the "normal ticket view" — title, description, metadata, comments, and activity. This is the anchor for the card, where the initial context lives before specifying begins.

Initially, users will copy-paste descriptions from Linear. Over time, Workhorse may become the primary place to write descriptions directly.

## Metadata

- [ ] Card tab shows: title, description, status, team, assignee, priority
- [ ] Description is a rich text field (or markdown) that the user edits directly
- [ ] Description is collaboratively editable — multiple users can edit simultaneously
- [ ] Card metadata (status, team, assignee) is editable inline
- [ ] All edits and metadata changes are visible to other users in real time
- [ ] Card tab is the default view when opening a card
- [ ] The AI interviewer reads the card description as starting context for the chat

## Tags

- [ ] The Card tab includes a tag editor for adding and removing tags
- [ ] Tags are entered as free text (no predefined set in v1)
- [ ] Existing tags are shown as removable chips

## Comments

- [ ] Comments section below the description
- [ ] Comments are human-only text entries (no AI participation)
- [ ] Each comment shows the author's avatar, display name, and timestamp
- [ ] Comments are attributed to the user who wrote them
- [ ] Comments are not included in the AI interview context

## Activity timeline

- [ ] An activity timeline at the bottom of the Card tab shows a chronological log of actions on the card
- [ ] Activities include: creation, status changes, spec updates, commits, dependency changes
