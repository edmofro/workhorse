---
title: Product navigation and onboarding
area: navigation
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

Within the active project, the sidebar shows three sections:

- [ ] **Specs** — links to the spec explorer (`/:projectSlug/specs`), the navigable hierarchy of merged specs from the main branch
- [ ] **Design** — links to the design browser (`/:projectSlug/design`), the project's design library
- [ ] **Teams** — lists all teams in the project, each linking to that team's board

## Teams section

- [ ] All teams in the project are listed under the Teams heading
- [ ] Clicking a team navigates to its board (a list of open cards grouped by status)
- [ ] Each team is shown with its colour dot and name

## Empty project onboarding

- [ ] When a project has zero teams, the sidebar Teams section shows an empty state with a "Create team" action
- [ ] The main content area explains that a team is needed before cards can be created
- [ ] The "New card" button is disabled when no teams exist

## Product creation

- [ ] Creating a product in settings opens an inline form with empty fields
- [ ] The GitHub URL field is required and validated (must match `github.com/:owner/:repo` pattern) before the product can be saved
- [ ] Owner and repo name are derived from the URL automatically

## Open questions

> **Sidebar depth:** Should the Specs and Design links always be visible, or collapse under a disclosure triangle?

> **Project switcher style:** Dropdown from sidebar header (like Slack) or a dedicated switcher row? The Slack approach is compact but the dropdown needs to feel lightweight, not like entering a separate workspace.
