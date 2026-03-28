# WH-016: Feature card (Card tab)

**Status:** Not started
**Priority:** High
**Team:** Platform

## Summary

Each feature has a Card tab that serves as the "normal ticket view" — title, description, metadata, and a comments section. This is the anchor for the feature, where the initial context lives before specifying begins.

## Context

Initially, users will copy-paste feature descriptions from Linear. Over time, Workhorse may become the primary place to write feature descriptions directly.

## Acceptance criteria

- [ ] Card tab shows: title, description, status, team, assignee, priority
- [ ] Description is a rich text field (or markdown) that the user edits directly
- [ ] Description is collaboratively editable — multiple users can edit simultaneously
- [ ] Comments section below the description — human-only, no AI participation
- [ ] Comments are attributed to the user who wrote them
- [ ] Card metadata (status, team, assignee) is editable inline
- [ ] All edits and metadata changes are visible to other users in real time
- [ ] Card tab is the default view when opening a feature
- [ ] The AI interviewer reads the card description as starting context for the chat
