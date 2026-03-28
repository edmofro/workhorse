---
title: Workflow quality gates and enforcement
area: workflow
status: draft
---

Ensures the commit and completion workflows enforce the ordering and quality constraints described in the product specs.

## Commit does not auto-complete

- [ ] Committing specs no longer automatically sets the feature status to SPEC_COMPLETE
- [ ] If the feature is NOT_STARTED or SPECIFYING, committing leaves the status unchanged
- [ ] A separate "Mark spec complete" action is available on the Card or Spec tab
- [ ] Marking spec complete triggers an AI completeness assessment (using the existing `analyseCompleteness` utility and optionally a fresh-eyes review prompt)
- [ ] If the AI assessment finds significant gaps, the user is shown the findings and asked to confirm before the status changes
- [ ] A feature can be committed multiple times while still in SPECIFYING status (iterative workflow)

## Dependency commit ordering

- [ ] When committing a feature that depends on other features, the system checks whether all parent features have been committed (have a non-null `specBranch`)
- [ ] If any parent feature has not been committed, the commit is blocked with a clear message naming the uncommitted parent(s)
- [ ] The commit button tooltip or disabled state indicates the blocking dependency when applicable

## Dependency status ordering

- [ ] A feature cannot be marked SPEC_COMPLETE if any of its parent features are not SPEC_COMPLETE
- [ ] The "Mark spec complete" action checks parent statuses and shows a blocking message if parents are incomplete

## Add existing spec to card

- [ ] The Spec tab includes an "Add existing spec" action alongside the "Create spec" action
- [ ] "Add existing spec" opens a browser showing the product's spec tree (from the main branch via the specs-tree API)
- [ ] Selecting a spec from the tree fetches its current content from GitHub and creates a FeatureSpec record with `isNew: false`
- [ ] The spec editor shows the existing content as the starting point for the user's edits
- [ ] The committed diff will show only the user's changes relative to the main-branch version

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

> **Completeness gate strictness:** Should the AI completeness check be a hard gate (blocking status change) or a soft warning (user can override)? The spec says the AI "gives honest assessment and pushes back" but doesn't explicitly say it can block.

> **Comment model:** Should comments reuse SpecMessage with a "comment" role, or be a dedicated Comment model? Reusing SpecMessage is simpler but muddies the message history.
