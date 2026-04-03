---
title: Card view
area: cards
card: WH-016
---

The card view is the home state of the card workspace — title, description, metadata, and comments. This is the anchor for the card, where the initial context lives before specifying begins. An input bar with action pills sits at the bottom, and the files panel is open on the right (see `card-navigation.md`).

Initially, users will copy-paste descriptions from Linear. Over time, Workhorse may become the primary place to write descriptions directly.

## Layout

- [ ] Card view shows: title, property strip, description, attachments, comments
- [ ] The property strip sits between the title and the description
- [ ] The description is unconstrained in height — it grows to fit its content rather than being capped at a fixed number of rows
- [ ] The entire card scrolls as a single unit — there is no inner scroll region within the description

## Property strip

The property strip is a single horizontal row of interactive pills showing status, priority, team, assignee, and tags. It replaces the former stacked metadata rows and separate tags section.

- [ ] The strip shows, left to right: status, priority, team, assignee — then dependency identifiers (if any) — then a mid-dot separator — then tags
- [ ] Each property pill is bare text at rest, gaining a subtle rounded background on hover
- [ ] Clicking a property pill opens a dropdown below it; the dropdown uses the same visual shell as the board card overflow menu: surface background, default border, extra-large border-radius, large shadow, 12px item text
- [ ] The selected option is shown in medium weight; unselected options are secondary text
- [ ] The status pill includes a status dot (matching the board column headers and the dot states used throughout the app)
- [ ] Dropdown closes on selection, on click outside, or on scroll
- [ ] Dependency identifiers are shown as read-only monospace labels in the strip; they are not interactive
- [ ] Description is editable directly in the card view
- [ ] Card metadata (status, team, assignee) is editable inline
- [ ] All edits and metadata changes are visible to other users in real time
- [ ] Card view is the default when opening a card
- [ ] The AI agent reads the card description as starting context for the chat

## Tags in the property strip

- [ ] Tags appear inline in the property strip after the mid-dot separator
- [ ] Each tag is shown as a chip with a remove button
- [ ] Up to three tags are shown inline; if more exist, a `+N more` pill appears after the visible tags
- [ ] The `+N more` pill opens a small dropdown listing the hidden tags, each with a remove button
- [ ] A `+ tag` pill at the end of the strip triggers an inline text input; pressing Enter or blurring commits the tag
- [ ] Tags are free text (no predefined set)
- [ ] Duplicate tags are silently ignored

## Comments

- [ ] Comments section below the description
- [ ] Comments are human-only text entries (no AI participation)
- [ ] Each comment shows the author's avatar, display name, and timestamp
- [ ] Comments are attributed to the user who wrote them
- [ ] Comments are not included in the AI agent session context
