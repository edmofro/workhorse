---
title: Workhorse v1 overview
status: draft
---

Workhorse is a spec-driven development workbench with three major areas: tickets (feature cards, AI-assisted spec interviews, specs auto-committed to the codebase), a spec explorer (navigable hierarchy of merged specs per product from main branch), and a design library (living design system per product in `.workhorse/design/`).

## Who it's for

Product owners, testers, and developers — anyone who specifies what software should do. Product owners and testers are the primary audience.

## Key concepts

- **Product** — the user-facing concept for a codebase (e.g., "Tamanu", "Tupaia"). Maps to a GitHub repo under the hood.
- **Feature card** — a unit of work being specced. Has three tabs: Card, Chat, Spec.
- **Spec** — the acceptance criteria and requirements. A card may create new specs and edit existing ones. Committed to the product's codebase as structured markdown.
- **Spec explorer** — a navigable hierarchy of merged specs for each product, built from the main branch.
- **Design library** — markdown design system docs, reusable HTML/CSS components, and views in `.workhorse/design/`. AI references it for mockup consistency. Committed mockups live in `design/mockups/<card-id>/` and link back to their specs via HTML comment headers. Components and views are edited by designers only through the design library explorer.

## The v1 flow

- [ ] User creates a feature card — copy-paste from Linear initially, write directly in Workhorse later
- [ ] User describes the feature on the Card tab — title, description, metadata, team comments
- [ ] User enters the Chat tab — AI interviewer with remote access to the target codebase
- [ ] Back-and-forth interview — the AI probes for edge cases, identifies interactions, generates mockups when helpful. Supports BA work: flow diagrams, business rule identification, process mapping
- [ ] AI drafts spec documents — may create new specs and identify existing specs that need updating. Automatic or user-triggered
- [ ] User edits specs directly on the Spec tab — shows all specs this card touches. Chat continues alongside
- [ ] Fresh-eyes review — independent agents review the draft spec without conversation context, surfacing gaps, contradictions, and missed edge cases. Multiple passes available
- [ ] Changes auto-commit — every agent turn and user edit (on leaving edit mode) is committed to the card's branch with an AI-generated descriptive message. No manual "Commit" step
- [ ] User iterates — further edits are saved automatically on each edit cycle
- [ ] User marks spec ready — a meaningful quality bar, not just a button click. The AI pushes back if areas remain uncovered. Transitions the card from SPECIFYING → IMPLEMENTING. Generates a downloadable implementation prompt (.md) that tells the dev's AI to diff specs against main to see what to implement
- [ ] Developer implements — downloads prompt, checks out branch, works locally with their AI tool
- [ ] Spec merges to main — appears in the product's spec explorer as part of the knowledge base

## Key decisions

- **Products not repos.** Users think in products. Repos are infrastructure.
- **Deployment:** Hosted SaaS on Railway. Single service with persistent disk for git worktrees and agent sessions. PostgreSQL on Railway for the database.
- **AI codebase access:** Remote Claude agents (review-hero / ask-ai pattern). No pre-indexing.
- **Multiplayer:** Spec document is collaborative. Chat is one user + AI per session.
- **Three tabs per feature:** Card, Chat, Spec. Mockups live in chat and a persistent mockups panel, not a separate tab.
- **Spec format:** Markdown with YAML frontmatter, committed to `.workhorse/specs/` directory organised by area.
- **Multi-spec cards:** A card can create new specs and edit existing ones. Git mechanics are invisible — changes auto-commit to the card's branch.
- **Card dependencies:** Cards can depend on other cards. Workhorse handles branch ordering and rebasing under the hood — users just see "depends on."
- **Spec explorer:** Reads the spec tree from main. Each spec links back to its card. Shows pending changes from open cards.
- **Design library:** Per-product `.workhorse/design/` directory with root-level design system docs, `components/`, `views/`, and `mockups/`. AI references it for mockup consistency.

## Not in v1

AI implementation agents, AI test generation, feature environment hot-reload, configurable columns, role-based permissions, Linear integration, Figma integration.
