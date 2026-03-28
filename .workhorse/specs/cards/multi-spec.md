---
title: Multi-spec cards
area: cards
card: WH-018
status: draft
---

A feature card isn't "one spec" — it's a set of changes to the spec tree. A card may create new specs and edit existing ones. Under the hood this maps to a git branch, but the user just sees "the specs on this card."

## Examples

- **New allergies feature:** Creates `specs/patient/allergies.md` (new) and modifies `specs/patient/merge.md` (edit existing to address merge behaviour for the new field)
- **Rework scheduling:** Modifies `specs/scheduling/appointments.md` and `specs/scheduling/recurring-appointments.md`, creates `specs/scheduling/waitlist.md`
- **Simple bug spec:** Modifies a single existing spec with a new criterion

## How specs are identified during the interview

The AI identifies which specs are needed based on the conversation and its codebase analysis. For new features, the AI suggests which area and filename to use. When the AI detects interactions with existing functionality, it proposes pulling in the relevant existing spec for editing. The user can also browse the product's spec tree and manually add existing specs to the card.

## Spec tab

- [ ] Shows a list of spec documents this card is working on
- [ ] Each spec is tagged: "new" or "editing existing"
- [ ] Clicking a spec opens it in the editor
- [ ] For edits to existing specs, the current version from main is the starting point
- [ ] User can browse the product's full spec tree and add existing specs to the card
- [ ] User can create additional new specs and choose their area/filename

## During the interview

- [ ] AI identifies which new specs to create and which existing specs need updating
- [ ] AI pulls existing specs from main when it identifies they need changes
- [ ] The conversation can naturally move between discussing different specs
- [ ] Spec extractions from the chat are directed to the appropriate spec document

## Committing

- [ ] "Commit" saves all spec documents to the product's codebase together
- [ ] New specs are added, existing specs are modified in place
- [ ] Subsequent edits are saved automatically
- [ ] All git operations (branching, committing, PRs) are invisible to the user

## Visibility in the spec explorer

- [ ] The spec explorer (showing main) indicates when specs have pending changes on open cards
- [ ] E.g., browsing `specs/patient/merge.md` shows "WH-042 has proposed changes"
- [ ] Two cards editing the same spec is surfaced as a potential conflict
