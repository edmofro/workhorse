---
title: Card dependencies
area: cards
card: WH-019
---

Cards can depend on other cards. When card B depends on card A, B's specs build on top of A's. Under the hood this means branches, rebases, and ordering — but the user never sees any of that. They just see "B depends on A" and Workhorse handles the rest.

## Why this matters

A common pattern: card A introduces a new patient allergies feature, card B adds allergy checking to the lab request flow. B's specs reference and build on A's. If A's specs change, B needs to incorporate those changes. Git handles this naturally with branches, but product owners shouldn't think about branches.

## Epics

No special "epic" concept is needed. An epic is just a card whose description is the high-level scope, with dependent child cards for each piece. If we later need status rollup or progress views across children, that's a natural extension of dependencies.

## User-facing concepts

- **"Depends on"** — card B depends on card A. B can see and build on A's spec changes.
- **Order** — dependent cards form a natural sequence. A must be spec-complete before B can be committed.
- **Blocked** — if A's specs change after B was written, B is flagged for review (not broken, just needs attention).

## Setting dependencies

The **From property** in the properties bar (see `branch-context.md`) is the primary surface for viewing and changing a card's dependency. It shows `From main` or `From WH-058`.

- [ ] User can set "depends on" from one card to another via the From property dropdown
- [ ] The From property dropdown is searchable and lists all cards on the same team/project, plus "main"
- [ ] Dependencies can be set during card creation or later
- [ ] The AI can suggest dependencies during the session when it identifies interactions
- [ ] A card can depend on multiple cards
- [ ] Circular dependencies are prevented

## Spec visibility

- [ ] A dependent card can see the specs from its parent cards (not just what's on main)
- [ ] When editing specs on card B that depends on A, the editor shows A's uncommitted spec changes as context
- [ ] The AI agent has access to parent card specs, not just what's on main

## Under the hood

- [ ] Workhorse creates branches off parent card branches automatically
- [ ] When a parent card's specs are updated, dependent cards are rebased automatically
- [ ] When a parent card's specs merge to main, dependent cards are rebased onto main automatically

## Conflict handling

Conflicts are resolved automatically by an AI subagent (see `branch-context.md` for the full conflict resolution architecture).

- [ ] Workhorse attempts automatic rebase when parent specs change
- [ ] If rebase succeeds cleanly, the dependent card is updated silently
- [ ] If rebase fails (conflicting changes to the same spec), an AI subagent resolves the conflicts within the card's worktree
- [ ] If the subagent resolves successfully, the result is pushed automatically
- [ ] If the subagent fails, the card shows an error and the user is notified

## Ordering and status

- [ ] Dependent cards can be specced in parallel with their parents
- [ ] A card's specs can only be committed if its parent cards have committed first
- [ ] A card's specs can only be marked "spec complete" if its parents are spec complete
- [ ] The team board shows dependency relationships (subtle, not cluttering the card)
