---
title: Teams and boards
area: navigation
card: WH-007
status: draft
---

The home view of Workhorse. Each team has a board — a list of open cards grouped by status. Teams belong to a single project.

## Team board

- [ ] Clicking a team in the sidebar opens its board
- [ ] The board shows cards grouped by status: Not started, Specifying, Spec complete
- [ ] Each card shows: ID, title, description snippet, tags, assignee
- [ ] Cards can be created, edited, and archived
- [ ] Clicking a card opens it with tabs: Card, Chat, Spec
- [ ] Cards can be filtered by status and assignee

## Cards

- [ ] A card is a unit of work being specced — the equivalent of a ticket
- [ ] Each card belongs to one team
- [ ] Cards have metadata: ID (WH-###), title, description, status, priority, assignee, tags
- [ ] Cards are created from a team's board via a "New card" button

## Teams

- [ ] Teams are configurable (name, colour)
- [ ] Each team belongs to a single project
- [ ] Cards belong to a team and appear on that team's board
- [ ] Users can join any team linked to a project they have write access to, or create a new one (see WH-021)
- [ ] Team management (join, leave, create) is available in the sidebar Teams section (see `navigation/product-navigation.md`)

## Projects

- [ ] Projects are the user-facing concept (e.g., "Tamanu", "Tupaia") — each maps to a GitHub repo under the hood
- [ ] The user is always in the context of one project, selected via the project switcher (see `navigation/product-navigation.md`)
- [ ] Within a project, the sidebar shows Specs, Design, and Teams sections
- [ ] A card's project is determined by its team
- [ ] Project management (adding repos, naming projects) is in settings
