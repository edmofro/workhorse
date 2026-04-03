---
title: Spec editor
area: editor
card: WH-002
---

A rich editor for viewing and editing specs within Workhorse. Product owners and testers work with specs without touching markdown. Developers can also toggle to the underlying format.

## File navigation

Specs and mockups are listed in the files panel — a persistent thin panel on the right edge (see `card-navigation.md` for full files panel behaviour). The panel shows this card's files with human-readable labels, and the ⌄ dropdown in the artifact header provides search across all project specs.

- [ ] Clicking a spec in the files panel opens it as an artifact (chat left, spec right)
- [ ] Clicking a project spec (via dropdown) opens it for reading; editing it adds it to the card's working set
- [ ] The files panel is always available — hover to peek in artifact mode, open in chat/home mode
- [ ] Search in the file dropdown filters both card specs and project specs by label and filename (see `labels.md`)

## Viewing

- [ ] Specs open in the artifact area as rendered markdown (read-only by default)
- [ ] Chat remains visible on the left — the user can discuss the spec while reading it
- [ ] ◀ ▶ arrows in the header bar flip between this card's files (specs and mockups)

## Editing

- [ ] **Edit button** in the artifact header makes the spec editable in-place — no layout change, chat stays visible
- [ ] Rich text editor for spec content (not raw markdown for non-technical users)
- [ ] Supports the spec format defined in WH-006
- [ ] Structured editing: add/remove/reorder acceptance criteria
- [ ] Supports sections and hierarchy
- [ ] Changes attributed to the user who made them
- [ ] Toggle between rich view and raw markdown view
- [ ] Collaboratively editable by multiple users
- [ ] **"Done editing"** returns to read-only and triggers auto-commit (see `commit-specs.md`)
- [ ] Switching to another file while editing prompts "Save changes to {filename}?" with Save / Discard options

## Tracked-changes view

When editing an existing spec, the user can see what they've changed relative to the original. This follows the document-editor convention (like tracked changes in Word, Slab, or Google Docs) rather than a developer-style red/green diff.

- [ ] The spec editor shows a "Show changes" toggle when editing an existing spec (one that was pulled from the main branch, not created new)
- [ ] When "Show changes" is active, the editor switches to a tracked-changes view:
  - Deleted text is shown with a strikethrough and a muted red background
  - Added text is shown with a muted green background
  - Changes are grouped sensibly: a single changed word appears inline, a run of changed words appears as a contiguous block, and short unchanged runs (a word or two) between changes are absorbed into the surrounding group rather than breaking it up
  - Unchanged text is shown normally
  - Changes are rendered inline within the document flow (not side-by-side panels)
- [ ] The tracked-changes view is read-only — the user toggles back to the normal editor to make further changes
- [ ] The comparison baseline is the content from the main branch at the time the spec was attached to the card
- [ ] The toggle is not shown for new specs (nothing to compare against)

## Saving

Auto-save writes to the Workhorse database continuously — the user never loses work. Git commits happen automatically when the user leaves edit mode or the agent finishes a turn (see `commit-specs.md` for full details). There is no manual commit button.

- [ ] Auto-save to Workhorse database — continuous, invisible, no data loss
- [ ] Changes visible via the Changes toggle in the artifact header bar (see `card-navigation.md`)

## Open questions

> **Editor framework:** Consider TipTap or Plate for the rich text foundation. McBean uses Loro CRDT for collaborative editing — worth evaluating.
