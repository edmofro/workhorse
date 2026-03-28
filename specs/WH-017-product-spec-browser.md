# WH-017: Product spec explorer

**Status:** Not started
**Priority:** High
**Team:** Platform

## Summary

A navigable hierarchy of specs organised by product. Products are the user-facing concept (Tamanu, Tupaia) — each product maps to a repo under the hood but users think in terms of products, not repos.

The spec explorer shows the living body of specs that have been merged to main. It's the "what does this product do?" reference, built up naturally as specs are committed and merged.

## Context

As specs accumulate, they form a knowledge base for each product. Product owners, testers, and developers need to browse this — to understand how things work, check for interactions, and avoid contradictions. This is also the reference the AI interviewer draws on when identifying interactions during specifying.

Each spec in the browser links back to the Workhorse card that created it, providing access to the full chat history, comments, and mockups that led to the spec.

## Acceptance criteria

### Products

- [ ] Products are the primary organising concept (not repos)
- [ ] Each product has a name, and maps to a GitHub repository under the hood
- [ ] Products appear in the sidebar navigation
- [ ] Clicking a product shows its spec hierarchy and its feature cards

### Spec hierarchy in the codebase

- [ ] Specs are committed as markdown files in a structured directory within the repo
- [ ] The directory structure defines the hierarchy (e.g., `.workhorse/specs/patient/allergies.md`, `.workhorse/specs/sync/facility-sync.md`)
- [ ] Workhorse reads the spec tree from the repo's main branch to build the browser
- [ ] When new specs are merged to main, the browser updates

### Spec browser

- [ ] Navigable tree/outline of specs for each product
- [ ] Hierarchy based on the directory structure in the repo
- [ ] Each spec is viewable as a clean document (like the spec review page)
- [ ] Each spec links back to the Workhorse card that created or last modified it
- [ ] Search across all specs within a product

### Relationship between cards and specs

- [ ] A Workhorse feature card creates and develops a spec (via chat, editing, mockups)
- [ ] When the spec is committed and eventually merged, it appears in the product spec explorer
- [ ] The card remains as the record of how the spec was developed — chat history, comments, mockups
- [ ] If a spec is updated later (new card, or direct edit), the browser reflects the latest from main

## Open questions

- ~~Hierarchy depth:~~ Resolved: arbitrary nesting via directories.
- **Area organisation:** Who decides the hierarchy? Does the AI suggest where a spec should live based on codebase structure, or does the user choose?
- **Existing code without specs:** For areas of the product that predate Workhorse, is there value in backfilling specs? Or does the hierarchy just grow organically from new work?
