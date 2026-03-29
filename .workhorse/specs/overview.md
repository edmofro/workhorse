---
title: Workhorse v1 overview
status: draft
---

Workhorse is a spec-driven development workbench with three major areas: cards (AI-assisted spec interviews, specs auto-committed to the codebase), a spec explorer (navigable hierarchy of merged specs per project from main branch), and a design library (living design system per project in `.workhorse/design/`).

## Who it's for

Product owners, testers, and developers — anyone who specifies what software should do. Product owners and testers are the primary audience.

## Key concepts

- **Project** — the user-facing concept for a codebase (e.g., "Tamanu", "Tupaia"). Maps to a GitHub repo under the hood.
- **Team** — a group within a project. Each team has a board showing its open cards.
- **Card** — a unit of work being specced. Opens as a workspace with an ever-present floating chat, spec/mockup views, and a right panel for file navigation. Lives on a team's board.
- **Spec** — the acceptance criteria and requirements. A card may create new specs and edit existing ones. Committed to the project's codebase as structured markdown.
- **Spec explorer** — a navigable hierarchy of merged specs for each project, built from the main branch.
- **Design library** — markdown design system docs, reusable HTML/CSS components, and views in `.workhorse/design/`. AI references it for mockup consistency. Committed mockups live in `design/mockups/<card-id>/` and link back to their specs via HTML comment headers. Components and views are edited by designers only through the design library explorer.

## The v1 flow

- [ ] User creates a card on a team's board — copy-paste from Linear initially, write directly in Workhorse later
- [ ] User describes the work on the card view — title, description, metadata, comments
- [ ] User starts a conversation via floating chat or action pill — AI interviewer with remote access to the target codebase
- [ ] Back-and-forth interview — the AI probes for edge cases, identifies interactions, generates mockups when helpful. Supports BA work: flow diagrams, business rule identification, process mapping
- [ ] AI drafts spec documents — may create new specs and identify existing specs that need updating. Automatic or user-triggered
- [ ] User edits specs by clicking them in the right panel — opens spec view with floating chat at the bottom. Chat continues alongside
- [ ] Fresh-eyes review — independent agents review the draft spec without conversation context, surfacing gaps, contradictions, and missed edge cases. Multiple passes available
- [ ] Changes auto-commit — every agent turn and user edit (on leaving edit mode) is committed to the card's branch with an AI-generated descriptive message
- [ ] User iterates — further edits are saved automatically on each edit cycle
- [ ] User marks spec ready — a meaningful quality bar, not just a button click. The AI pushes back if areas remain uncovered. Transitions the card from SPECIFYING → IMPLEMENTING. Generates a downloadable implementation prompt (.md) that tells the dev's AI to diff specs against main to see what to implement
- [ ] Developer implements — downloads prompt, checks out branch, works locally with their AI tool
- [ ] Spec merges to main — appears in the project's spec explorer as part of the knowledge base

## Key decisions

- **Projects not repos.** Users think in projects. Repos are infrastructure.
- **Global project context.** The user is always in one project at a time, with a lightweight switcher to move between them.
- **Teams have boards.** Each team's board is a list of open cards grouped by status — the home view for day-to-day work.
- **Deployment:** Hosted SaaS on Railway. Single service with persistent disk for git worktrees and agent sessions. PostgreSQL on Railway for the database.
- **AI codebase access:** Remote Claude agents (review-hero / ask-ai pattern). No pre-indexing.
- **Multiplayer:** Spec document is collaborative. Chat is one user + AI per session.
- **Single workspace per card:** No tabs. An ever-present floating chat with card details as the home state, spec view and mockup view opened from a persistent right panel. See `card-navigation.md`.
- **Spec format:** Markdown with YAML frontmatter, committed to `.workhorse/specs/` directory organised by area.
- **Multi-spec cards:** A card can create new specs and edit existing ones. Git mechanics are invisible — changes auto-commit to the card's branch.
- **Card dependencies:** Cards can depend on other cards. Workhorse handles branch ordering and rebasing under the hood — users just see "depends on."
- **Spec explorer:** Reads the spec tree from main. Each spec links back to its card. Shows pending changes from open cards.
- **Design library:** Per-project `.workhorse/design/` directory with root-level design system docs, `components/`, `views/`, and `mockups/`. AI references it for mockup consistency.

## Not in v1

AI implementation agents, AI test generation, hot-reload environments, configurable columns, role-based permissions, Linear integration, Figma integration.
