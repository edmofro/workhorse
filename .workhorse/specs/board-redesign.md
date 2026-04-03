---
title: Board redesign — kanban columns and project selector
area: navigation
status: draft
---

Redesign the cards board from a vertical status-grouped list to a horizontal kanban board with columns per status. Replace the "Board" title and chunky filter/new-card buttons with a compact header featuring a project selector dropdown and small icon actions.

## Terminology note

This spec uses the **future naming convention**: "workspace" for the top-level repo-backed container (currently `Project` in the DB), "project" for the sub-grouping of cards (currently `Team` in the DB). The code may still reference the old names until the rename tech debt is addressed separately.

## Board layout

- [ ] The board uses horizontal columns, one per status: Not started, Specifying, Implementing, Complete
- [ ] Columns are always visible even when empty (show a subtle empty state)
- [ ] Cards stack vertically within each column
- [ ] Each column has a header with a status dot, label, and card count
- [ ] Columns scroll vertically independently when content overflows
- [ ] No list/board toggle — the board is always in column view
- [ ] The board fills the available height below the header (no page-level scroll)

## Board header

- [ ] The "Board" title is removed — the topbar contains only the project selector and action icons
- [ ] Left side: project selector dropdown (see below)
- [ ] Right side: three small icon-only action buttons — Search, Filter, New card
- [ ] Icon buttons use the sidebar convention: 14px icons, `p-2` padding, `text-[var(--text-muted)]` default, `hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]` on hover, `transition-colors duration-100`
- [ ] Filter icon shows a small accent dot when filters are active
- [ ] The topbar remains 52px height for consistency with other views

## Project selector

- [ ] A compact trigger button in the topbar showing the current project name (or "All projects") with a chevron-down icon
- [ ] Trigger button style: `text-[13px] font-medium text-[var(--text-secondary)]` with subtle hover
- [ ] Clicking opens a dropdown panel below the trigger
- [ ] Dropdown has a search/autocomplete input at the top, autofocused on open
- [ ] "All projects" is a persistent option at the top of the list
- [ ] Below that, a "Recently viewed" section showing the 3 most recently selected projects
- [ ] Below that, the full project list filtered by the search input
- [ ] Each project item shows the project name and its colour dot
- [ ] Selecting a project filters the board to show only cards from that project (team)
- [ ] Dropdown closes on selection or clicking outside
- [ ] Designed to handle dozens of projects without performance issues

## Card rendering in columns

- [ ] Cards in columns use a compact variant — no description snippet, tighter padding
- [ ] Card shows: identifier (monospace, muted), title, tags, assignee avatar
- [ ] Cards retain their hover border/shadow treatment
- [ ] Priority is not visually shown on the card (low-value density)

## Empty states

- [ ] Empty column: a subtle centred message like "No cards" in muted text
- [ ] Empty board (no cards at all): centred message with prompt to create first card
- [ ] Board with project filter showing no results: message indicating no cards in that project

## Status column order

Left to right: Not started, Specifying, Implementing, Complete. Active work in the middle, backlog on the left and done on the right.

A hidden Cancelled column sits at the far right, collapsed by default. It shows a count badge when cancelled cards exist and can be expanded to view them. See `card-cancellation.md`.
