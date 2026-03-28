---
title: Workflow quality gates and enforcement
area: workflow
status: draft
---

Ordering and quality constraints in the commit and completion workflows.

## Committing and status are independent

- [ ] Committing specs pushes the current spec content to the project's codebase — it does not change the card's status
- [ ] A card can be committed multiple times while in any status (iterative workflow)
- [ ] Status progression is an explicit user action via the status field on the Card tab
- [ ] The three statuses (Not started, Specifying, Spec complete) behave like column states — the user moves the card forward when they judge it ready
- [ ] The AI completeness assessment and auto-review inform the user's decision but do not gate the status change itself

## Dependency commit ordering

- [ ] When committing a card that depends on other cards, the system checks whether all parent cards have been committed
- [ ] If any parent card has not been committed, the commit is blocked with a clear message naming the uncommitted parent(s)
- [ ] The commit button tooltip or disabled state indicates the blocking dependency when applicable

## Dependency status ordering

- [ ] A card cannot move to Spec complete if any of its parent cards are not Spec complete
- [ ] Setting the status checks parent statuses and shows a blocking message if parents are incomplete

## Editing existing specs

When a card needs to modify an existing spec (not create a new one), the user finds it and starts editing in one motion.

### Finding the spec

- [ ] The Spec tab includes an "Edit existing spec" action alongside the "Create spec" action
- [ ] Clicking it opens a search-and-browse overlay showing the project's spec tree (from the main branch)
- [ ] The overlay supports both free-text search (filtering by path and content) and tree navigation
- [ ] Selecting a spec immediately fetches its current content and opens it in the editor — one click from search result to editing
- [ ] The spec list sidebar updates to include the newly attached spec

### Tracked-changes diff view

When editing an existing spec, the user needs to see what they've changed relative to the original. This follows the document-editor convention (like tracked changes in Word, Slab, or Google Docs) rather than a developer-style red/green diff.

- [ ] The spec editor shows a "Show changes" toggle when editing an existing spec (one that was pulled from the main branch, not created new)
- [ ] When "Show changes" is active, the editor switches to a tracked-changes view:
  - Deleted text is shown with a strikethrough and a muted red/pink background
  - Added text is shown with a green/teal background
  - Unchanged text is shown normally
  - Changes are rendered inline within the document flow (not side-by-side panels)
- [ ] The tracked-changes view is read-only — the user toggles back to the normal editor to make further changes
- [ ] The comparison baseline is the content from the main branch at the time the spec was attached to the card
- [ ] The toggle is not shown for new specs (nothing to compare against)

## Comments

- [ ] The Card tab includes a comments section below the metadata and above the activity timeline
- [ ] Comments are human-only text entries (no AI participation)
- [ ] Each comment shows the author's avatar, display name, and timestamp
- [ ] Comments are not included in the AI interview context

## Tag management

- [ ] The Card tab includes a tag editor for adding and removing tags on a card
- [ ] Tags are entered as free text (no predefined set in v1)
- [ ] Existing tags on the card are shown as removable chips

## Open questions

> **Diff algorithm:** For the tracked-changes view, what diffing approach works best for prose? The diff should understand document structure rather than treating content as flat text.
