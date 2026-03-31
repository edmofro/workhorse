---
title: Multi-spec cards
area: cards
card: WH-018
---

A card isn't "one spec" — it's a set of changes to the spec tree. A card may create new specs and edit existing ones. Under the hood this maps to a git branch, but the user just sees "the specs on this card."

## Examples

- **New allergies feature:** Creates `specs/patient/allergies.md` (new) and modifies `specs/patient/merge.md` (edit existing to address merge behaviour for the new field)
- **Rework scheduling:** Modifies `specs/scheduling/appointments.md` and `specs/scheduling/recurring-appointments.md`, creates `specs/scheduling/waitlist.md`
- **Simple bug spec:** Modifies a single existing spec with a new criterion

## How specs are identified during the interview

The AI identifies which specs are needed based on the conversation and its codebase analysis. For new work, the AI suggests which area and filename to use. When the AI detects interactions with existing functionality, it proposes pulling in the relevant existing spec for editing. The user can also browse the project's spec tree and manually add existing specs to the card.

## Files panel and artifact view

- [ ] The files panel shows this card's specs and mockups (the working set), with the full project spec tree available via the ⌄ dropdown search (see `card-navigation.md` for files panel and file dropdown behaviour)
- [ ] Each card spec is tagged: "new" or "editing existing"
- [ ] Clicking a spec opens it as an artifact (chat left, spec right)
- [ ] For edits to existing specs, the current version from main is the starting point
- [ ] Browsing the project specs via the file dropdown and clicking a spec opens it for reading; editing it adds it to the card
- [ ] User can create additional new specs and choose their area/filename

## During the interview

- [ ] AI identifies which new specs to create and which existing specs need updating
- [ ] AI pulls existing specs from main when it identifies they need changes
- [ ] The conversation can naturally move between discussing different specs
- [ ] Spec extractions from the chat are directed to the appropriate spec document

## Committing

- [ ] All spec documents auto-commit to the card's branch when the user leaves edit mode or the agent finishes a turn (see `commit-specs.md`)
- [ ] New specs are added, existing specs are modified in place
- [ ] All git operations (branching, committing, PRs) are invisible to the user

## Visibility in the spec explorer

- [ ] The spec explorer (showing main) indicates when specs have pending changes on open cards
- [ ] E.g., browsing `specs/patient/merge.md` shows "WH-042 has proposed changes"
- [ ] Two cards editing the same spec is surfaced as a potential conflict
