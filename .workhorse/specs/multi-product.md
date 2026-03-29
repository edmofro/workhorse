---
title: Multi-product support
area: products
card: WH-010
status: draft
---

Workhorse manages specs across multiple projects. Projects are the user-facing concept (Tamanu, Tupaia) — each project maps to a GitHub repository under the hood. Since users sign in with GitHub, Workhorse can offer their repositories directly rather than requiring manual URL entry.

## Multi-project

- [ ] Each team belongs to a single project
- [ ] A card's project is determined by its team
- [ ] The AI agent loads context from the team's project codebase
- [ ] Specs are committed to the team's project codebase
- [ ] One card always targets exactly one project
- [ ] Project management is in settings
- [ ] The user is always in the context of one project, selected via the project switcher in the sidebar
- [ ] A user can only see projects linked to GitHub repos they have write access to (see `auth.md`)

## Adding projects from GitHub

- [ ] The primary way to add a project is by selecting a repository from the user's GitHub account
- [ ] Settings shows an "Add project" button that opens a repository picker
- [ ] The repository picker lists GitHub repositories the user has write access to, fetched using their OAuth token
- [ ] Repositories are searchable by name within the picker
- [ ] Repositories already added as projects are shown as disabled / greyed out in the picker
- [ ] Selecting a repository auto-populates the project name (from the repository name), GitHub URL, owner, repo name, and default branch
- [ ] The project name defaults to the repository name but is editable after creation
- [ ] The default branch is read from the repository's settings on GitHub (not hardcoded to "main")

## Open questions

> **Organisation filtering:** Should the picker group repositories by GitHub organisation, or show a flat searchable list? Grouping by org may help users with access to many repos across multiple organisations.
