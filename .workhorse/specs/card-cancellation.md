---
title: Card cancellation and cancelled status
area: board
status: draft
---

Add the ability to cancel cards from the board view via an overflow menu, with a hidden "Cancelled" column that can be expanded to view cancelled cards.

## Cancelled status

- [x] Add `CANCELLED` as a valid card status alongside NOT_STARTED, SPECIFYING, IMPLEMENTING, COMPLETE
- [x] Cancelled cards display with reduced opacity (0.6) and a strikethrough title
- [x] The cancelled status dot uses `--text-muted` fill (grey, signalling inactive)
- [x] Status change to CANCELLED is logged as a `status_changed` activity

## Board card overflow menu

- [x] Each board card has a three-dot overflow menu (MoreHorizontal icon) in the top-right corner
- [x] The menu trigger is hidden by default, visible on card hover, always visible when menu is open
- [x] Menu contains a "Status" submenu listing all statuses (Not started, Specifying, Implementing, Complete, Cancelled)
- [x] The current status is highlighted with bold text in the submenu
- [x] Menu contains a "Cancel card" shortcut action below a separator, styled in red (`--diff-red`)
- [x] Clicking outside the menu closes it
- [x] Status changes from the menu are applied immediately via server action

## Cancelled column on the board

- [x] The Cancelled column is hidden by default — it does not appear alongside the four main status columns
- [x] When cancelled cards exist, a collapsed indicator appears at the right edge of the board showing the cancelled count, a status dot, and a chevron
- [x] Clicking the collapsed indicator expands the Cancelled column to full width (max 280px)
- [x] The expanded column has a collapse button (chevron-left) to hide it again
- [x] When no cancelled cards exist, neither the indicator nor the column is shown

## Status dropdown and filters

- [x] The card detail status dropdown includes "Cancelled" as an option
- [x] The board filter panel includes "Cancelled" in the status filter dropdown
