---
title: Workhorse v1 overview
status: draft
---

Workhorse is a spec-driven development workbench with three major areas: cards (AI-assisted spec interviews, committing specs to the codebase), a spec explorer (navigable hierarchy of merged specs per project from main branch), and a design library (living design system per project in `.workhorse/design/`).

## Who it's for

Product owners, testers, and developers — anyone who specifies what software should do. Product owners and testers are the primary audience.

## Key concepts

- **Project** — the user-facing concept for a codebase (e.g., "Tamanu", "Tupaia"). Maps to a GitHub repo under the hood.
- **Team** — a group within a project. Each team has a board showing its open cards.
- **Card** — a unit of work being specced. Has three tabs: Card, Chat, Spec. Lives on a team's board.
- **Spec** — the acceptance criteria and requirements. A card may create new specs and edit existing ones. Committed to the project's codebase as structured markdown.
- **Spec explorer** — a navigable hierarchy of merged specs for each project, built from the main branch.
- **Design library** — markdown design system docs, reusable HTML/CSS components, and views in `.workhorse/design/`. AI references it for mockup consistency. Committed mockups live in `design/mockups/<card-id>/` and link back to their specs via HTML comment headers. Components and views are edited by designers only through the design library explorer.

## The v1 flow

- [ ] User creates a card on a team's board — copy-paste from Linear initially, write directly in Workhorse later
- [ ] User describes the work on the Card tab — title, description, metadata, comments
- [ ] User enters the Chat tab — AI interviewer with remote access to the target codebase
- [ ] Back-and-forth interview — the AI probes for edge cases, identifies interactions, generates mockups when helpful. Supports BA work: flow diagrams, business rule identification, process mapping
- [ ] AI drafts spec documents — may create new specs and identify existing specs that need updating. Automatic or user-triggered
- [ ] User edits specs directly on the Spec tab — shows all specs this card touches. Chat continues alongside
- [ ] Auto-review — an independent agent reviews the draft specs without conversation context, surfacing gaps, contradictions, and missed edge cases. Multiple passes available
- [ ] User commits specs — saves all spec changes to the project's codebase. Workhorse handles branches and PRs invisibly
- [ ] User iterates — further edits are saved automatically
- [ ] User marks spec complete — a meaningful quality bar, not just a button click. The AI pushes back if areas remain uncovered. Generates a downloadable implementation prompt (.md) that tells the dev's AI to diff specs against main to see what to implement
- [ ] Developer implements — downloads prompt, checks out branch, works locally with their AI tool
- [ ] Spec merges to main — appears in the project's spec explorer as part of the knowledge base

## Key decisions

- **Projects not repos.** Users think in projects. Repos are infrastructure.
- **Global project context.** The user is always in one project at a time, with a lightweight switcher to move between them.
- **Teams have boards.** Each team's board is a list of open cards grouped by status — the home view for day-to-day work.
- **Deployment:** Hosted SaaS. Start with Railway or Vercel. No vendor lock-in.
- **AI codebase access:** Remote Claude agents (review-hero / ask-ai pattern). No pre-indexing.
- **Multiplayer:** Spec document is collaborative. Chat is one user + AI per session.
- **Three tabs per card:** Card, Chat, Spec. Mockups live in chat and a persistent mockups panel, not a separate tab.
- **Spec format:** Markdown with YAML frontmatter, committed to `.workhorse/specs/` directory organised by area.
- **Multi-spec cards:** A card can create new specs and edit existing ones. Git mechanics are invisible.
- **Card dependencies:** Cards can depend on other cards. Workhorse handles branch ordering and rebasing under the hood — users just see "depends on."
- **Spec explorer:** Reads the spec tree from main. Each spec links back to its card. Shows pending changes from open cards.
- **Design library:** Per-project `.workhorse/design/` directory with root-level design system docs, `components/`, `views/`, and `mockups/`. AI references it for mockup consistency.

## Not in v1

AI implementation agents, AI test generation, hot-reload environments, configurable columns, role-based permissions, Linear integration, Figma integration.
