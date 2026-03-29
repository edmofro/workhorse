---
title: Project spec explorer
area: navigation
card: WH-017
status: draft
---

A navigable hierarchy of specs organised by project. Projects are the user-facing concept (Tamanu, Tupaia) — each project maps to a repo under the hood but users think in terms of projects, not repos.

The spec explorer shows the living body of specs that have been merged to main. It's the "what does this project do?" reference, built up naturally as specs are committed and merged.

As specs accumulate, they form a knowledge base for each project. Product owners, testers, and developers need to browse this — to understand how things work, check for interactions, and avoid contradictions. This is also the reference the AI interviewer draws on when identifying interactions during specifying. Each spec in the browser links back to the Workhorse card that created it, providing access to the full chat history, comments, and mockups that led to the spec.

## Projects

- [ ] Projects are the primary organising concept (not repos)
- [ ] Each project has a name, and maps to a GitHub repository under the hood
- [ ] The spec explorer is accessible from the Specs link in the sidebar for the active project

## Spec hierarchy in the codebase

- [ ] Specs are committed as markdown files in a structured directory within the repo
- [ ] The directory structure defines the hierarchy (e.g., `specs/patient/allergies.md`, `specs/sync/facility-sync.md`)
- [ ] Workhorse reads the spec tree from the repo's main branch to build the browser
- [ ] When new specs are merged to main, the browser updates

## Spec browser

- [ ] Navigable tree/outline of specs for each project
- [ ] Hierarchy based on the directory structure in the repo
- [ ] Each spec is viewable as a clean document (like the spec review page)
- [ ] Each spec links back to the Workhorse card that created or last modified it
- [ ] Search across all specs within a project

## Relationship between cards and specs

- [ ] A Workhorse card creates and develops specs (via chat, editing, mockups)
- [ ] When specs are committed and eventually merged, they appear in the project spec explorer
- [ ] The card remains as the record of how the spec was developed — chat history, comments, mockups
- [ ] If a spec is updated later (new card, or direct edit), the browser reflects the latest from main

## Open questions

> **Area organisation:** Who decides the hierarchy? Does the AI suggest where a spec should live based on codebase structure, or does the user choose?

> **Existing code without specs:** For areas of the project that predate Workhorse, is there value in backfilling specs? Or does the hierarchy just grow organically from new work?
