---
title: Product navigation and onboarding
area: navigation
status: draft
---

Navigation structure: a global project switcher sets the context, and the sidebar provides access to everything within the active project.

## Project switcher

- [ ] The user is always in the context of one project at a time
- [ ] A project switcher in the sidebar header (or top-left) lets the user switch between projects they have access to
- [ ] The switcher shows the active project's name and opens a dropdown listing all available projects
- [ ] Switching is lightweight and fluid — not a full page reload or "entering a workspace", just swapping context
- [ ] Keyboard shortcuts allow quick switching between recent projects (e.g. Cmd+1, Cmd+2)
- [ ] The most recently used projects appear first in the list

## Sidebar structure

Within the active project, the sidebar shows these sections top to bottom:

### Header

- [ ] Logo and app name ("Workhorse") at the top
- [ ] Project switcher dropdown below

### Action buttons

- [ ] A row of icon buttons sits between the project switcher and the navigation items
- [ ] **Search** (`Search` icon) — opens the search interface (not inline; a separate view or command palette). Displays as a compact icon button
- [ ] **New** (`Plus` icon) — opens the unified creation modal (see `ai-card-creation.md`). Displays as a compact icon button
- [ ] Both buttons are right-aligned in the row, subtle but always visible

### Navigation

- [ ] **Cards** — links to the project board (`/:projectSlug`), a list of cards grouped by status with filters
- [ ] **Specs** — links to the spec explorer (`/:projectSlug/specs`), the navigable hierarchy of merged specs from the main branch
- [ ] **Design** — links to the design browser (`/:projectSlug/design`), the project's design library

### Recent conversations

- [ ] Shows the most recently active conversation sessions for the current user within the active project
- [ ] Each entry is a conversation session — these are deep links into conversations, not cards
- [ ] Multiple entries may reference the same card (different conversations on the same card)
- [ ] **Card-bound sessions** show the card identifier prefix and session title, with a status-coloured dot (based on card status: amber for in-progress, hollow for not started, green for complete)
- [ ] **Standalone sessions** (no card) show just the session title with a chat bubble icon instead of a status dot — visually distinct from card-bound sessions
- [ ] Capped at 8 items, sorted by `lastMessageAt` descending
- [ ] Card-bound sessions link to `/:projectSlug/cards/:identifier?session=:sessionId`
- [ ] Standalone sessions link to `/:projectSlug/sessions/:sessionId`

### User menu

- [ ] User avatar and display name at the bottom
- [ ] Ellipsis button opens a dropdown with Settings and Sign out

## Teams

Teams are not exposed in the sidebar or as a primary navigation concept. They exist in the data model for card organisation and filtering, but are accessed through the Cards board view as a filter dimension — not as a top-level navigation destination.

- [ ] The sidebar does not show a Teams section
- [ ] Team filtering is available on the Cards board page via the existing filter controls
- [ ] Card creation defaults the team silently (first available team in the project) rather than requiring the user to choose

## Empty project onboarding

- [ ] When a project has no cards, the board shows an empty state with guidance
- [ ] The "New" button in the sidebar is always enabled (creates a card with default team)

## Product creation

- [ ] Creating a product in settings opens an inline form with empty fields
- [ ] The GitHub URL field is required and validated (must match `github.com/:owner/:repo` pattern) before the product can be saved
- [ ] Owner and repo name are derived from the URL automatically
