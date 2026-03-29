---
title: Spec editor
area: editor
card: WH-002
status: draft
---

A rich editor for viewing and editing specs within Workhorse. Product owners and testers work with specs without touching markdown. Developers can also toggle to the underlying format.

## File navigation via right panel

File navigation for specs has moved from a left sidebar to the persistent right panel (see `card-navigation.md`). The right panel is visible across all views (card, chat, spec) and has the same two-layer structure: card specs at the top, project specs below a separator.

- [ ] Clicking a spec in the right panel opens it in the spec view (720px centred, with floating chat at the bottom)
- [ ] Clicking a project spec opens it for reading; editing it adds it to the card's working set
- [ ] The right panel is always present — no separate sidebar within the spec editor
- [ ] Search in the right panel filters both card specs and project specs by label and filename (see labels.md)

## Editing

- [ ] Rich text editor for spec content (not raw markdown for non-technical users)
- [ ] Supports the spec format defined in WH-006
- [ ] Structured editing: add/remove/reorder acceptance criteria
- [ ] Supports sections and hierarchy
- [ ] Changes attributed to the user who made them
- [ ] Toggle between rich view and raw markdown view
- [ ] Collaboratively editable by multiple users

## Tracked-changes view

When editing an existing spec, the user can see what they've changed relative to the original. This follows the document-editor convention (like tracked changes in Word, Slab, or Google Docs) rather than a developer-style red/green diff.

- [ ] The spec editor shows a "Show changes" toggle when editing an existing spec (one that was pulled from the main branch, not created new)
- [ ] When "Show changes" is active, the editor switches to a tracked-changes view:
  - Deleted text is shown with a strikethrough and a muted red/pink background
  - Added text is shown with a green/teal background
  - Unchanged text is shown normally
  - Changes are rendered inline within the document flow (not side-by-side panels)
- [ ] The tracked-changes view is read-only — the user toggles back to the normal editor to make further changes
- [ ] The comparison baseline is the content from the main branch at the time the spec was attached to the card
- [ ] The toggle is not shown for new specs (nothing to compare against)

## Saving and committing

Two layers: auto-save writes to the Workhorse database continuously (the user never loses work, no manual save needed), and commit pushes the current state to the project's codebase (branch and PR) — intentional and explicit.

The Commit button is dormant when the codebase is up to date. When the user makes changes that haven't been committed, the button becomes enabled and visually draws attention. After committing, it returns to dormant. Auto-save does not create git commits. Commits are meaningful, intentional checkpoints.

## Saving

- [ ] Auto-save to Workhorse database — continuous, invisible, no data loss
- [ ] Change history available (who changed what, when)

## Committing

- [ ] Commit button is dormant when no uncommitted changes exist
- [ ] Commit button becomes enabled and visually prominent when there are uncommitted changes
- [ ] Clicking Commit pushes current state to the project's codebase
- [ ] After committing, button returns to dormant state
- [ ] First commit creates the branch and PR; subsequent commits update them

## Open questions

> **Editor framework:** Consider TipTap or Plate for the rich text foundation. McBean uses Loro CRDT for collaborative editing — worth evaluating.

> **Diff algorithm:** For the tracked-changes view, what diffing approach works best for prose? The diff should understand document structure rather than treating content as flat text.
