---
title: Card view
area: cards
card: WH-016
---

The card view is the home state of the card workspace — title, description, metadata, comments, and activity. This is the anchor for the card, where the initial context lives before specifying begins. An input bar with action pills sits at the bottom, and the files panel is open on the right (see `card-navigation.md`).

Initially, users will copy-paste descriptions from Linear. Over time, Workhorse may become the primary place to write descriptions directly.

## Metadata

- [ ] Card view shows: title, description, status, team, assignee, priority
- [ ] Description is a rich text field (or markdown) that the user edits directly
- [ ] Description is collaboratively editable — multiple users can edit simultaneously
- [ ] Card metadata (status, team, assignee) is editable inline
- [ ] All edits and metadata changes are visible to other users in real time
- [ ] Card view is the default when opening a card
- [ ] The AI agent reads the card description as starting context for the chat

## Tags

- [ ] The card view includes a tag editor for adding and removing tags
- [ ] Tags are entered as free text (no predefined set in v1)
- [ ] Existing tags are shown as removable chips

## Comments

- [ ] Comments section below the description
- [ ] Comments are human-only text entries (no AI participation)
- [ ] Each comment shows the author's avatar, display name, and timestamp
- [ ] Comments are attributed to the user who wrote them
- [ ] Comments are not included in the AI agent session context

## Activity log

- [ ] An activity log records deterministic events on the card: creation, status changes, spec updates, commits, dependency changes
- [ ] The activity log is stored for auditing but is not shown in the card view — the journey bar (see `workflow-orchestration.md`) is the user-facing record of progress
