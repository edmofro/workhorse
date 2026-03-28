---
title: Teams and feature list
area: navigation
card: WH-007
status: draft
---

The home view of Workhorse — a list of feature cards grouped by team, with basic status tracking. Each team belongs to a single product.

## Feature list

- [ ] Features displayed as cards, grouped by status
- [ ] Each card shows: ID, title, description snippet, tags, assignee
- [ ] Statuses: Not started, Specifying, Spec complete
- [ ] Features can be created, edited, and archived
- [ ] Clicking a feature opens it with tabs: Card, Chat, Spec
- [ ] Features can be filtered by status, team, and assignee
- [ ] Database-backed

## Teams

- [ ] Teams are configurable (name, colour)
- [ ] Each team belongs to a single product
- [ ] Features belong to a team
- [ ] Team is a sidebar navigation item, clicking it filters the feature list

## Products

- [ ] Products are the user-facing concept (e.g., "Tamanu", "Tupaia") — each maps to a GitHub repo under the hood
- [ ] Products appear in the sidebar navigation
- [ ] Clicking a product shows two things: its feature cards (active work) and its spec explorer (merged specs from main)
- [ ] A feature card's product is determined by its team
- [ ] Product management is in settings (adding repos, naming products)
