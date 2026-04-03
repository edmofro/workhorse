---
title: Drag and drop card movement between columns
area: navigation
card: WH-033
---

Users can drag cards between kanban columns to change their status. The card's column placement updates immediately on drop, and the change persists.

## Dragging a card

- [ ] Any card on the board can be dragged by clicking and holding on it
- [ ] While dragging, the card appears as a semi-transparent ghost following the cursor
- [ ] The original card slot remains visible as a placeholder in its source column during the drag, so column heights do not collapse
- [ ] Dragging does not open the card

## Drop targets

- [ ] Each column is a valid drop target for any dragged card
- [ ] When a dragged card hovers over a column, the column gives a subtle visual highlight to indicate it will accept the drop
- [ ] The card can be dropped at any position within a column — between existing cards or at the top or bottom
- [ ] A visual insertion indicator (a horizontal line) shows where the card will land within the column
- [ ] Dropping a card onto its own column at its original position is a no-op

## Status change on drop

- [ ] Dropping a card into a different column changes the card's status to match that column
- [ ] The status change takes effect immediately in the UI without waiting for a server round-trip (optimistic update)
- [ ] If the server rejects the status change, the card snaps back to its original column and an error is surfaced

## Card ordering

- [ ] Cards dropped into a column are inserted at the position indicated by the drop target
- [ ] The chosen order persists — reloading the board preserves the card's position within its column
- [ ] Cards not involved in the drag retain their relative order within their column

## Cancelling a drag

- [ ] Pressing Escape during a drag cancels the operation and returns the card to its original position
- [ ] Releasing the pointer outside any valid drop target cancels the drag and returns the card to its original position

## Interaction with filters

- [ ] The drag-and-drop interaction works the same way when a project filter is active — only the visible cards are draggable, and the filtered view reflects the moved card's new status immediately

## Open questions

> **Status transition rules:** Are there any restrictions on which status transitions are permitted via drag? For example, can a card move freely from Complete back to Not started, or are some transitions blocked?

> **Column order persistence:** Is drag-to-reorder within the same column in scope for this card, or is cross-column movement (status change) the only goal?

> **Touch support:** Should drag and drop work on touch devices, or is pointer/mouse-only acceptable for v1?
