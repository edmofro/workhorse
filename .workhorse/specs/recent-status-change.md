---
title: Status change from recent conversations
area: navigation
card: WH-056
---

Card-bound sessions in the sidebar "Recent" section show a status dot reflecting the card's current status. Clicking the dot opens a compact inline dropdown to change that card's status without leaving the current view.

## Status dot interaction

- [ ] The status dot on card-bound recent sessions is a clickable target, distinct from clicking the session row itself
- [ ] Clicking the row (anywhere except the dot) navigates to the conversation as normal
- [ ] Clicking the dot opens a status dropdown anchored below-left of the dot; the dot does not navigate
- [ ] The dot's hit area is large enough to click reliably — at least 20×20px — without enlarging the visible dot
- [ ] On hover, the dot shows a subtle ring or pointer cursor to signal it is interactive
- [ ] Standalone sessions (shown with a chat icon instead of a dot) have no status interaction — the icon is not clickable

## Status dropdown

- [ ] The dropdown lists all card statuses in order: Not started, Specifying, Implementing, Complete, Cancelled
- [ ] Each option includes its status dot (using the same dot style as the sidebar and board: hollow for Not started, amber for Specifying and Implementing, green for Complete, muted grey for Cancelled) followed by the status label
- [ ] The current status is shown in medium weight; all other options use secondary weight
- [ ] Selecting an option updates the card's status immediately (optimistic) and closes the dropdown
- [ ] The sidebar dot updates to reflect the new status without requiring a full page reload
- [ ] The dropdown closes on selection, on click outside, or on Escape
- [ ] The dropdown uses the standard shell: surface background, default border, extra-large border-radius, large shadow — consistent with other dropdowns in the app (see `card-tab.md`)
- [ ] The dropdown is compact in width to fit within or near the 216px sidebar without overflowing the viewport edge

## Optimistic update and error handling

- [ ] The dot colour changes immediately on selection, before server confirmation
- [ ] If the server returns an error, the dot reverts to its previous colour and a brief error toast is shown
- [ ] No confirmation dialog is required — status changes are immediately reversible by reopening the dropdown
