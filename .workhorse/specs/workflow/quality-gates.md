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

## Spec tab: card changes and project specs

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
- [ ] A "This card only" filter chip (or toggle) collapses the project tree back to show just the card's working set

### Smooth transitions

- [ ] Browsing the project tree and editing a card's specs use the same editor area — the only thing that changes is what the sidebar shows
- [ ] A user can fluidly move between reviewing the full spec landscape and focusing on their card's changes without any hard mode switch
- [ ] The search bar is always accessible, whether the project tree is expanded or collapsed — it serves as a quick way to find and open any spec

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
