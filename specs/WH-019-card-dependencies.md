# WH-019: Card dependencies

**Status:** Not started
**Priority:** High
**Team:** Platform

## Summary

Cards can depend on other cards. When card B depends on card A, B's specs build on top of A's. Under the hood this means branches, rebases, and ordering — but the user never sees any of that. They just see "B depends on A" and Workhorse handles the rest.

## Why this matters

A common pattern: card A introduces a new patient allergies feature, card B adds allergy checking to the lab request flow. B's specs reference and build on A's. If A's specs change, B needs to incorporate those changes. Git handles this naturally with branches, but product owners shouldn't think about branches.

## Epics

No special "epic" concept is needed. An epic is just a card whose description is the high-level scope, with dependent child cards for each piece. If we later need status rollup or progress views across children, that's a natural extension of dependencies.

## User-facing concepts

- **"Depends on"** — card B depends on card A. B can see and build on A's spec changes.
- **Order** — dependent cards form a natural sequence. A must be spec-complete before B can be committed.
- **Blocked** — if A's specs change after B was written, B is flagged for review (not broken, just needs attention).

## What the user never sees

- Branch names
- Rebase operations
- Base branch selection
- Any git terminology

## Acceptance criteria

### Setting dependencies

- [ ] User can set "depends on" from one card to another
- [ ] Dependencies can be set during card creation or later
- [ ] The AI can suggest dependencies during the interview when it identifies interactions
- [ ] A card can depend on multiple cards
- [ ] Circular dependencies are prevented

### Spec visibility

- [ ] A dependent card can see the specs from its parent cards (not just what's on main)
- [ ] When editing specs on card B that depends on A, the editor shows A's uncommitted spec changes as context
- [ ] The AI interviewer has access to parent card specs, not just what's on main

### Under the hood

- [ ] Workhorse creates branches off parent card branches automatically
- [ ] When a parent card's specs are updated, dependent cards are rebased automatically
- [ ] When a parent card's specs merge to main, dependent cards are rebased onto main automatically

### Conflict handling

This is a known hard problem that needs further design. The current approach:

- [ ] Workhorse attempts automatic rebase when parent specs change
- [ ] If rebase succeeds cleanly, the dependent card is updated silently
- [ ] If rebase fails (conflicting changes to the same spec), the dependent card is flagged "needs review"
- [ ] The user sees a clear message: which specs conflict, between which cards
- [ ] Resolution options: side-by-side diff with the ability to pick changes, or edit directly to reconcile
- [ ] Option to ask a developer to resolve if the conflict is too complex

> **This needs its own detailed spec.** Conflict resolution UX (what the side-by-side view looks like, how picks work, how the resolved version gets committed) is complex enough to warrant a separate card once we have real usage patterns.

### Ordering and status

- [ ] Dependent cards can be specced in parallel with their parents
- [ ] A card's specs can only be committed if its parent cards have committed first
- [ ] A card's specs can only be marked "spec complete" if its parents are spec complete
- [ ] The feature list shows dependency relationships (subtle, not cluttering the card)
