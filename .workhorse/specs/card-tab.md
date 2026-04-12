---
title: Card view
area: cards
card: WH-016
---

The card view is the home state of the card workspace — title, description, metadata, and comments. This is the anchor for the card, where the initial context lives before specifying begins. An input bar with action pills sits at the bottom, and the files panel is open on the right (see `card-navigation.md`).

Initially, users will copy-paste descriptions from Linear. Over time, Workhorse may become the primary place to write descriptions directly.

## Layout

- [ ] Card view shows: title, description, attachments, comments
- [ ] The description is unconstrained in height — it grows to fit its content rather than being capped at a fixed number of rows
- [ ] The entire card scrolls as a single unit — there is no inner scroll region within the description
- [ ] Card metadata (status, priority, team, assignee) is managed via the properties bar shared across all card views — see `card-navigation.md`
- [ ] Description is editable directly in the card view
- [ ] All edits and metadata changes are visible to other users in real time
- [ ] Card view is the default when opening a card
- [ ] The AI agent reads the card description as starting context for the chat

## Tags

Tags appear in the card view body, below the title. They are not shown in the properties bar.

- [ ] Tags are shown as a row of chips, each with a remove button
- [ ] Up to three tags are shown inline; if more exist, a `+N more` pill appears after the visible tags
- [ ] The `+N more` pill opens a small dropdown listing the hidden tags, each with a remove button
- [ ] A `+ tag` pill at the end triggers an inline text input; pressing Enter or blurring commits the tag
- [ ] Tags are free text (no predefined set)
- [ ] Duplicate tags are silently ignored

## Comments

- [ ] Comments section below the description
- [ ] Comments are human-only text entries (no AI participation)
- [ ] Each comment shows the author's avatar, display name, and timestamp
- [ ] Comments are attributed to the user who wrote them
- [ ] Comments are not included in the AI agent session context

## Activity log

- [ ] An activity log records deterministic events on the card: creation, status changes, spec updates, commits, dependency changes
- [ ] The activity log is stored for auditing but is not shown in the card view — the journey section in the properties bar (see `workflow-orchestration.md`) is the user-facing record of progress
