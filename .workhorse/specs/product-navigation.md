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

Within the active project, the sidebar shows sections top to bottom:

### Header

- [ ] Logo and app name ("Workhorse") at the top
- [ ] Project switcher dropdown below

### Sections

Each section is a row with a label, an icon, and optional hover actions. The label navigates to the section's full view. On hover, [🔍] and [+] icon buttons appear right-aligned, replacing truncated label space.

```
┌─ Workhorse ──────────────┐
│  Workhorse ▾              │
├──────────────────────────┤
│  ☐ Cards        [🔍] [+] │  ← hover to reveal actions
│  📄 Specs        [🔍] [+] │
│  🎨 Design       [🔍] [+] │
│  🗂 Code         [🔍]     │  ← search only, no +
│                           │
│  💬 Conversations [🔍] [+] │
│    ● WH-042: Initial…    │
│    💬 Schema question     │
│    ● WH-005: Now I h…    │
│    💬 Fix login idea      │
│    ● WH-038: Refine…     │
│    View all →             │
│                           │
├──────────────────────────┤
│  👤 Felix            •••  │
└──────────────────────────┘
```

#### Cards

- [ ] Clicking the label navigates to the project board (`/:projectSlug`)
- [ ] [🔍] opens search scoped to cards
- [ ] [+] opens the card creation modal (see `ai-card-creation.md`) — defaults to card-creation mode
- [ ] No recent items listed below — the board is the primary view

#### Specs

- [ ] Clicking the label navigates to the spec explorer (`/:projectSlug/specs`)
- [ ] [🔍] opens search scoped to specs
- [ ] [+] creates a quick card and drops the user into the spec editor (reverse workflow — spec first, card wraps around it)

#### Design

- [ ] Clicking the label navigates to the design browser (`/:projectSlug/design`)
- [ ] [🔍] opens search scoped to design files
- [ ] [+] creates a quick card and drops the user into mockup mode

#### Code

- [ ] Clicking the label navigates to the code browser (`/:projectSlug/code`) — placeholder for now
- [ ] [🔍] opens search scoped to code
- [ ] No [+] button — there is no meaningful "create a new code file" action

#### Conversations

- [ ] Clicking the label navigates to a conversations list view (`/:projectSlug/conversations`)
- [ ] [🔍] opens search scoped to conversations
- [ ] [+] opens the creation modal (see `ai-card-creation.md`) — defaults to chat mode
- [ ] Below the section label, up to 5 recent conversations are listed
- [ ] **Card-bound sessions** show a status dot (coloured by card status: amber for in-progress, hollow for not started, green for complete) followed by `{cardIdentifier}: {sessionTitle}`
- [ ] **Standalone sessions** show a `MessageCircle` icon (muted colour) followed by the session title
- [ ] A "View all" link appears below the last item when there are more conversations
- [ ] Each item is a deep link into the conversation

### Hover behaviour for section actions

- [ ] [🔍] and [+] icons are hidden by default; they appear on hover over the section row
- [ ] Icons use `--text-muted` colour, transitioning to `--text-secondary` on hover
- [ ] Icons sit right-aligned within the section row, overlapping the label's trailing space
- [ ] The section label itself remains clickable for navigation even when icons are visible

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
- [ ] The [+] on the Cards section is always enabled (creates a card with default team)

## Product creation

- [ ] Creating a product in settings opens an inline form with empty fields
- [ ] The GitHub URL field is required and validated (must match `github.com/:owner/:repo` pattern) before the product can be saved
- [ ] Owner and repo name are derived from the URL automatically
