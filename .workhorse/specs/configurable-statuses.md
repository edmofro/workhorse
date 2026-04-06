---
title: Configurable task statuses
area: board
card: WH-066
---

Each project (workspace) defines its own set of task statuses. Statuses determine the columns on the kanban board and the options available in status dropdowns and overflow menus. Every project ships with sensible defaults, but teams can rename, reorder, add, and remove statuses to match their workflow.

## Status definition

Each status has:

- [ ] A label — the human-readable name displayed on the board column header, status dropdowns, and card overflow menus
- [ ] A slug — a stable machine identifier derived from the label when the status is created (e.g. "In review" becomes `in-review`). The slug does not change if the label is later renamed
- [ ] A colour category — one of a fixed set that determines the status dot colour: grey (not started / inactive), amber (in progress), green (done), muted (cancelled / archived). The palette is not user-extensible
- [ ] A position — an integer that determines the left-to-right column order on the board

## Default statuses

When a new project is created, it receives these statuses in order:

- [ ] Not started (grey)
- [ ] Specifying (amber)
- [ ] Implementing (amber)
- [ ] Complete (green)
- [ ] Cancelled (muted)

These defaults match the current hardcoded statuses. Existing projects receive the same set as a one-time migration.

## Cancelled status

- [ ] Every project has exactly one status marked as the "cancelled" status. This controls which status triggers the collapsed cancelled column behaviour on the board (see `card-cancellation.md`)
- [ ] The cancelled status is always last in the column order and appears in the collapsed/expandable cancelled column, not as a regular board column
- [ ] A project cannot delete its cancelled status, but can rename it (e.g. "Archived", "Won't do")
- [ ] When creating a new status, it cannot be designated as cancelled — only the existing cancelled status can be renamed

## Done status

- [ ] Every project has exactly one status marked as the "done" status. This controls which status uses the green colour category and represents completed work
- [ ] The done status is always last among the regular (non-cancelled) columns

## Managing statuses

Status configuration lives in project settings, alongside project name and team management.

- [ ] A "Statuses" section in project settings shows the current statuses as a vertical list in column order
- [ ] Each status row shows the colour dot, the label, and the colour category
- [ ] Statuses can be reordered by dragging, with the constraint that the cancelled status stays last and the done status stays second-to-last
- [ ] Each status row has an inline edit affordance — clicking the label makes it editable
- [ ] Each status row has a colour category picker — a small dropdown with the four options (grey, amber, green, muted)
- [ ] Each status row has a delete button, disabled if the status is the cancelled status, the done status, or has cards assigned to it
- [ ] An "Add status" button appends a new status with a default label ("New status") and grey colour category, inserted before the done status
- [ ] When a status is deleted, any cards in that status must first be reassigned — a confirmation dialog asks the user to pick a replacement status

## Board columns

- [ ] The board renders one column per status, in the configured order, excluding the cancelled status
- [ ] The cancelled status renders as the collapsible column described in `card-cancellation.md`
- [ ] Column headers use the configured label and the dot colour from the status's colour category
- [ ] Adding or removing a status updates the board columns in real time

## Status dropdowns and menus

- [ ] The card detail status dropdown lists all configured statuses for the card's project
- [ ] The board card overflow menu's status submenu lists all configured statuses
- [ ] The board filter panel lists all configured statuses
- [ ] Drag-and-drop between columns continues to work, mapping each column to its status

## Cross-references

- `board-redesign.md` — board layout and column rendering
- `card-cancellation.md` — collapsed cancelled column behaviour
- `drag-drop-columns.md` — drag-and-drop between status columns
- `workflow-orchestration.md` — confirms statuses are configurable per project and decoupled from skills
