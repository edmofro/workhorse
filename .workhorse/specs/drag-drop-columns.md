---
title: Drag and drop between status columns
area: board
status: draft
---

Add drag-and-drop to the kanban board so cards can be moved between status columns by dragging, including dropping onto the collapsed cancelled column. The interaction should feel fluid and immediate, matching Linear's polish.

## Drag initiation

- [x] Cards are draggable via pointer (mouse or touch)
- [x] A 5px movement threshold prevents accidental drags when clicking
- [x] Clicking a card still navigates to the card detail view (drag does not hijack clicks)
- [x] The overflow menu remains functional and is not affected by drag behaviour

## Drag overlay

- [x] While dragging, a floating card preview follows the cursor
- [x] The overlay uses `--shadow-lg` (floating panel shadow) and a subtle 1.5° rotation for a lifted feel
- [x] The overlay is 260px wide, matching the approximate column card width
- [x] The original card in the column becomes translucent (opacity 0.3) during the drag
- [x] No spring physics, bounces, or scale animations — the overlay snaps to the cursor position
- [x] Drop animation is disabled (instant placement) for snappy feedback

## Drop targets

- [x] Each status column (Not started, Specifying, Implementing, Complete) is a drop target
- [x] The cancelled column — both expanded and collapsed — is a drop target
- [x] When dragging over a valid target column, the column background highlights with `--bg-hover`
- [x] Empty columns show a dashed border placeholder ("Drop here") when hovered during a drag
- [x] Dropping a card onto its current column is a no-op

## Collapsed cancelled column

- [x] The collapsed cancelled indicator becomes a drop target during any drag, even when no cancelled cards exist yet
- [x] When hovered, it highlights and shows a "Cancel" label below the count
- [x] Dropping onto the collapsed indicator changes the card's status to CANCELLED without expanding the column

## Optimistic updates

- [x] On drop, the card immediately appears in the target column before the server responds
- [x] The status change is persisted via the existing `updateCard` server action
- [x] On success, the board data is refetched to ensure consistency
- [x] On failure, the optimistic move is rolled back (card returns to its original column)

## Accessibility

- [x] Drag uses `@dnd-kit` which provides keyboard and screen reader support out of the box
- [x] The existing overflow menu status submenu remains as an alternative to drag for changing status

## Technology

- [x] Uses `@dnd-kit/core` and `@dnd-kit/sortable` (lightweight, React 19 compatible)
- [x] No additional CSS or animation libraries required
- [x] All transitions follow design system constraints (≤ 0.1s ease for hover states)
