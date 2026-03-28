# Workhorse v1 — Overview

## What it is

A spec-driven development workbench with three major areas:

1. **Tickets** — feature cards, AI-assisted spec interviews, committing specs to the codebase
2. **Spec explorer** — navigable hierarchy of merged specs per product (from main branch)
3. **Design** — a living design library per product (`.workhorse/design/` in the codebase) with design system docs, reusable components, views, and committed mockups

## Who it's for

Product owners, testers, and developers — anyone who specifies what software should do. Product owners and testers are the primary audience.

## Key concepts

- **Product** — the user-facing concept for a codebase (e.g., "Tamanu", "Tupaia"). Maps to a GitHub repo under the hood.
- **Feature card** — a unit of work being specced. Has three tabs: Card, Chat, Spec.
- **Spec** — the acceptance criteria and requirements. A card may create new specs and edit existing ones. Committed to the product's codebase as structured markdown.
- **Spec explorer** — a navigable hierarchy of merged specs for each product, built from the main branch.
- **Design library** — markdown design system docs, reusable HTML/CSS components, and views in `.workhorse/design/`. AI references it for mockup consistency. Committed mockups live in `design/mockups/<card-id>/` and link back to their specs via HTML comment headers. Components and views are edited by designers only through the design library explorer.

## The v1 flow

1. **Create a feature card** — copy-paste from Linear initially, write directly in Workhorse later
2. **Describe the feature** on the Card tab — title, description, metadata, team comments
3. **Enter the Chat tab** — AI interviewer with remote access to the target codebase
4. **Back-and-forth interview** — the AI probes for edge cases, identifies interactions, generates mockups when helpful. Supports BA work: flow diagrams, business rule identification, process mapping.
5. **AI drafts spec documents** — may create new specs and identify existing specs that need updating. Automatic or user-triggered.
6. **Edit specs directly** on the Spec tab — shows all specs this card touches. Chat continues alongside.
7. **Fresh-eyes review** — independent agents review the draft spec without conversation context, surfacing gaps, contradictions, and missed edge cases. Multiple passes available.
8. **Commit specs** — saves all spec changes to the product's codebase. Workhorse handles branches and PRs invisibly.
9. **Iterate** — further edits are saved automatically
10. **Mark spec complete** — a meaningful quality bar, not just a button click. The AI pushes back if areas remain uncovered. Generates a downloadable implementation prompt (.md) that tells the dev's AI to diff specs against main to see what to implement
10. **Developer implements** — downloads prompt, checks out branch, works locally with their AI tool
11. **Spec merges to main** — appears in the product's spec explorer as part of the knowledge base

## Key decisions

- **Products not repos.** Users think in products. Repos are infrastructure.
- **Deployment:** Hosted SaaS. Start with Railway or Vercel. No vendor lock-in.
- **AI codebase access:** Remote Claude agents (review-hero / ask-ai pattern). No pre-indexing.
- **Multiplayer:** Spec document is collaborative. Chat is one user + AI per session.
- **Three tabs per feature:** Card, Chat, Spec. Mockups live in chat and a persistent mockups panel, not a separate tab.
- **Spec format:** Markdown with YAML frontmatter, committed to `.workhorse/specs/` directory organised by area.
- **Multi-spec cards:** A card can create new specs and edit existing ones. Git mechanics are invisible.
- **Card dependencies:** Cards can depend on other cards. Workhorse handles branch ordering and rebasing under the hood — users just see "depends on."
- **Spec explorer:** Reads the spec tree from main. Each spec links back to its card. Shows pending changes from open cards.
- **Design library:** Per-product `.workhorse/design/` directory with root-level design system docs, `components/`, `views/`, and `mockups/`. AI references it for mockup consistency. Committed mockups live in `mockups/<card-id>/` and reference the specs they represent. Components and views are designer-edited only.

## Not in v1

AI implementation agents · AI test generation · Feature environment hot-reload · Configurable columns · Auth/permissions · Linear integration · Figma integration
