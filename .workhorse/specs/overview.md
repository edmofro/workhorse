---
title: Workhorse v1 overview
---

Workhorse is a spec-driven development workbench with three major areas: cards (AI-assisted spec interviews, specs auto-committed to the codebase), a spec explorer (navigable hierarchy of merged specs per project from main branch), and a design library (living design system per project in `.workhorse/design/`).

## Who it's for

Product owners, testers, and developers — anyone who specifies what software should do. Product owners and testers are the primary audience.

## Key concepts

- **Project** — the user-facing concept for a codebase (e.g., "Tamanu", "Tupaia"). Maps to a GitHub repo under the hood.
- **Team** — a group within a project. Each team has a board showing its open cards.
- **Card** — a unit of work being specced. Opens as a workspace with chat on the left and an artifact area on the right (Claude/ChatGPT artifact pattern). A files panel on the right edge lists the card's specs and mockups. Lives on a team's board.
- **Spec** — the acceptance criteria and requirements. A card may create new specs and edit existing ones. Committed to the project's codebase as structured markdown.
- **Spec explorer** — a navigable hierarchy of merged specs for each project, built from the main branch.
- **Design library** — markdown design system docs, reusable HTML/CSS components, and views in `.workhorse/design/`. AI references it for mockup consistency. Committed mockups live in `design/mockups/<card-id>/` and link back to their specs via HTML comment headers. Components and views are edited by designers only through the design library explorer.

## The flow

- [ ] User starts a conversation — either from a card or as a standalone session from the sidebar. Standalone sessions auto-create cards when file changes occur (see `conversation-sessions.md`)
- [ ] Alternatively, user creates a card on a team's board
- [ ] User describes the work on the card view — title, description, metadata, comments
- [ ] User starts a conversation via chat input or action pill — AI agent with remote access to the target codebase
- [ ] The jockey (see `workflow-orchestration.md`) observes the conversation, tracks progress in the journal, and suggests next steps via pills and the journey section
- [ ] Workshopping and ideation — the AI explores approaches, generates mockups, and helps refine thinking
- [ ] Spec interview — the AI probes for edge cases, identifies interactions, generates mockups. Supports BA work: flow diagrams, business rule identification, process mapping
- [ ] AI drafts spec documents — may create new specs and identify existing specs that need updating
- [ ] User edits specs by clicking them in the files panel — opens the spec as an artifact alongside the chat
- [ ] Fresh-eyes review — an independent subagent reviews the draft spec without conversation context, surfacing gaps, contradictions, and missed edge cases
- [ ] Changes auto-commit — every agent turn and user edit is committed to the card's branch
- [ ] Implementation — the agent implements acceptance criteria from specs, either in-app or via handoff to an external agent (Claude Code, Cursor, etc.)
- [ ] Design audit, security audit, code review — subagent skills that review the implementation
- [ ] PR creation — the agent creates a GitHub pull request, with optional auto-fix for CI failures
- [ ] Spec merges to main — appears in the project's spec explorer as part of the knowledge base

## Key decisions

- **Projects not repos.** Users think in projects. Repos are infrastructure.
- **Global project context.** The user is always in one project at a time, with a lightweight switcher to move between them.
- **Kanban board with project filter.** The board shows cards in horizontal status columns. A project selector dropdown (with search and recents) filters to a specific project's cards — the home view for day-to-day work. See `board-redesign.md`.
- **Deployment:** Hosted SaaS on Railway. Single service with persistent disk for git worktrees and agent sessions. PostgreSQL on Railway for the database.
- **AI codebase access:** Remote Claude agents (review-hero / ask-ai pattern). No pre-indexing.
- **Multiplayer:** Spec document is collaborative. Chat is one user + AI per session.
- **Unified artifact model:** Specs and mockups share the same chat + artifact layout (chat left, artifact right). No full-screen mockup overlay, no focus mode. A files panel on the right edge provides navigation. See `card-navigation.md`.
- **Spec format:** Markdown with YAML frontmatter, committed to `.workhorse/specs/` directory organised by area.
- **Multi-spec cards:** A card can create new specs and edit existing ones. Git mechanics are invisible — changes auto-commit to the card's branch.
- **Card dependencies:** Cards can depend on other cards. Workhorse handles branch ordering and rebasing under the hood — users just see "depends on."
- **Spec explorer:** Reads the spec tree from main. Each spec links back to its card. Shows pending changes from open cards.
- **Design library:** Per-project `.workhorse/design/` directory with root-level design system docs, `components/`, `views/`, and `mockups/`. AI references it for mockup consistency.

## Future

AI test generation, hot-reload environments, configurable columns, role-based permissions, Linear integration, Figma integration.
