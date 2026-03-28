---
title: Workflow quality gates and enforcement
area: workflow
status: draft
---

Ordering and quality constraints in the commit and completion workflows.

## Committing and status are independent

- [ ] Committing specs pushes the current spec content to the product's codebase — it does not change the feature's status
- [ ] A feature can be committed multiple times while in any status (iterative workflow)
- [ ] Status progression is an explicit user action via the status field on the Card tab
- [ ] The three statuses (Not started, Specifying, Spec complete) behave like column states — the user moves the card forward when they judge it ready
- [ ] The AI completeness assessment (via `analyseCompleteness` and the auto-review) informs the user's decision but does not gate the status change itself

## Dependency commit ordering

- [ ] When committing a feature that depends on other features, the system checks whether all parent features have been committed (have a non-null `specBranch`)
- [ ] If any parent feature has not been committed, the commit is blocked with a clear message naming the uncommitted parent(s)
- [ ] The commit button tooltip or disabled state indicates the blocking dependency when applicable

## Dependency status ordering

- [ ] A feature cannot move to SPEC_COMPLETE if any of its parent features are not SPEC_COMPLETE
- [ ] Setting the status checks parent statuses and shows a blocking message if parents are incomplete

## Editing existing specs

When a card needs to modify an existing spec (not create a new one), the user finds it and starts editing in one motion — no separate "add to card" step.

### Finding the spec

- [ ] The Spec tab includes an "Edit existing spec" action alongside the "Create spec" action
- [ ] Clicking it opens a search-and-browse overlay showing the product's spec tree (from the main branch via the specs-tree API)
- [ ] The overlay supports both free-text search (filtering by path and content) and tree navigation
- [ ] Selecting a spec immediately fetches its current content from GitHub, creates a FeatureSpec record with `isNew: false`, and opens it in the editor — one click from search result to editing
- [ ] The spec list sidebar updates to include the newly attached spec

### Tracked-changes diff view

When editing an existing spec, the user needs to see what they've changed relative to the original. This follows the document-editor convention (like tracked changes in Word, Slab, or Google Docs) rather than a developer-style red/green diff.

- [ ] The spec editor shows a "Show changes" toggle when editing an existing spec (one where `isNew: false` and `committedContent` or the original main-branch content is available)
- [ ] When "Show changes" is active, the editor switches to a tracked-changes view:
  - Deleted text is shown with a strikethrough and a muted red/pink background
  - Added text is shown with a green/teal background
  - Unchanged text is shown normally
  - Changes are rendered inline within the document flow (not side-by-side panels)
- [ ] The tracked-changes view is read-only — the user toggles back to the normal editor to make further changes
- [ ] The comparison baseline is the content from the main branch at the time the spec was attached to the card (stored as the initial `committedContent` or fetched from GitHub)
- [ ] The toggle is not shown for new specs (nothing to compare against)

## Feature comments

- [ ] The Card tab includes a comments section below the metadata and above the activity timeline
- [ ] Comments are human-only text entries (no AI participation)
- [ ] Each comment shows the author's avatar, display name, and timestamp
- [ ] Comments are stored as a separate model or as SpecMessage records with a distinct role (e.g. "comment")
- [ ] Comments are not included in the AI interview context

## Tag management

- [ ] The Card tab includes a tag editor for adding and removing tags on a feature
- [ ] Tags are entered as free text (no predefined set in v1)
- [ ] Existing tags on the feature are shown as removable chips
- [ ] Tags are persisted to the feature's `tags` JSON field

## Open questions

> **Comment model:** Should comments reuse SpecMessage with a "comment" role, or be a dedicated Comment model? Reusing SpecMessage is simpler but muddies the message history.

> **Diff algorithm:** For the tracked-changes view, what diffing library should we use? Options include `diff-match-patch` (Google's library, good for prose), `jsdiff`, or a markdown-aware diff that understands document structure rather than treating content as flat text.
