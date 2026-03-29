---
title: Spec editor
area: editor
card: WH-002
status: draft
---

A rich editor for viewing and editing specs within Workhorse. Product owners and testers work with specs without touching markdown. Developers can also toggle to the underlying format.

## Spec tab sidebar

The Spec tab's sidebar has two layers. The top section shows this card's specs (the focused working set). Below it, the full project spec tree is tucked away — revealed by a search bar or a "Project specs" disclosure. Editing any spec from the project tree silently attaches it to the card. The two layers feel like one continuous sidebar at different zoom levels, not separate modes.

### Card specs (top section, always visible)

- [ ] The top of the sidebar shows the specs this card is working on — new and edited
- [ ] Each entry shows the spec's file name and whether it is new or editing an existing spec
- [ ] Clicking a spec opens it in the editor
- [ ] A "Create spec" action allows creating a new blank spec

### Search bar (between sections)

- [ ] A search bar sits between the card specs and the project tree
- [ ] Typing filters the project tree below by path and content
- [ ] Clearing the search restores the full tree (if expanded) or collapses it back

### Project specs (below, collapsed by default)

- [ ] Below the search bar, a "Project specs" disclosure expands to show the full spec tree from the main branch
- [ ] The tree is collapsed by default — it does not clutter the sidebar until the user wants it
- [ ] Specs already on this card are visually highlighted in the tree (e.g. bold text, accent dot)
- [ ] Clicking any spec in the tree opens it in the editor in read mode
- [ ] An "Edit" action on each spec (or simply starting to type in the editor) attaches the spec to the card and enters edit mode
- [ ] Attaching a spec to the card does not navigate away from the project tree — the user stays in browsing context and can continue exploring other specs
- [ ] The newly attached spec also appears in the card specs section at the top
- [ ] A "Changed" filter chip collapses the project tree back to show just the card's working set

### Smooth transitions

- [ ] Browsing the project tree and editing a card's specs use the same editor area — the only thing that changes is what the sidebar shows
- [ ] A user can fluidly move between reviewing the full spec landscape and focusing on their card's changes without any hard mode switch
- [ ] The search bar is always accessible, whether the project tree is expanded or collapsed — it serves as a quick way to find and open any spec

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
