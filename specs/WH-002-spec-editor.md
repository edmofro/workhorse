# WH-002: Spec editor

**Status:** Not started
**Priority:** High
**Team:** Platform

## Summary

A rich editor for viewing and editing specs within Workhorse. Product owners and testers work with specs without touching markdown. Developers can also toggle to the underlying format.

## Saving and committing

Two layers:

1. **Auto-save** — writes to the Workhorse database continuously. The user never loses work. No manual save needed.
2. **Commit** — pushes the current state to the product's codebase (branch and PR). This is intentional and explicit.

The Commit button is dormant when the codebase is up to date. When the user makes changes that haven't been committed, the button becomes enabled and visually draws attention — indicating there are changes ready to push. After committing, it returns to dormant.

Auto-save does NOT create git commits. Commits are meaningful, intentional checkpoints.

## Acceptance criteria

### Editing

- [ ] Rich text editor for spec content (not raw markdown for non-technical users)
- [ ] Supports the spec format defined in WH-006
- [ ] Structured editing: add/remove/reorder acceptance criteria
- [ ] Supports sections and hierarchy
- [ ] Changes attributed to the user who made them
- [ ] Toggle between rich view and raw markdown view
- [ ] Collaboratively editable by multiple users

### Saving

- [ ] Auto-save to Workhorse database — continuous, invisible, no data loss
- [ ] Change history available (who changed what, when)

### Committing

- [ ] Commit button is dormant when no uncommitted changes exist
- [ ] Commit button becomes enabled and visually prominent when there are unsaved-to-codebase changes
- [ ] Clicking Commit pushes current state to the product's codebase
- [ ] After committing, button returns to dormant state
- [ ] First commit creates the branch and PR; subsequent commits update them

## Notes

Consider TipTap or Plate for the rich text foundation. McBean uses Loro CRDT for collaborative editing — worth evaluating.
