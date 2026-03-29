---
title: Automated spec review
area: workflow
status: draft
---

A fresh-context AI agent reviews the draft specs and posts its findings into the chat. The user doesn't leave the conversation — the review results land as a message, the interview AI sees them, and they work through the suggestions together.

## Triggering a review

- [ ] An "Auto-review" button is available via an action pill in the floating chat (see `card-navigation.md` for pill sets) and in the spec editor toolbar
- [ ] The button label communicates that this is an automated process, not a screen the user has to fill in — something like "Auto-review" or "Check spec"
- [ ] The button is disabled until at least one spec exists on the card
- [ ] Clicking it spins up a fresh AI context with no access to the conversation history

## What the review agent receives

- [ ] All draft specs on the card
- [ ] All mockups on the card
- [ ] Codebase access (same level as the interview agent)
- [ ] The full set of existing project specs from the main branch — not just the ones attached to this card

## What the review agent checks

- [ ] Gaps in the draft specs: missing edge cases, error states, permissions, data implications
- [ ] Contradictions and unstated assumptions within the draft specs
- [ ] Interactions with existing functionality that haven't been addressed
- [ ] **Cross-spec impact:** scans through every existing project spec to find areas that the new or changed specs would affect but that haven't been updated by this card. For example, if a new "allergies" spec changes how patient data is structured, the review should flag `patient/merge.md` if it references patient data but hasn't been included on the card. This is one of several review responsibilities — the agent should flag substantive impacts, not speculate about tangential connections
- [ ] **Information architecture:** checks that each spec's sections belong to its title and area, flags misplaced content (e.g. UI layout details in an auth spec, tag management in a quality gates spec), and identifies duplicated information that should be consolidated with cross-references

## How results appear

- [ ] Findings are posted into the chat as a system message (visually distinct from user and assistant messages)
- [ ] The message includes specific, actionable suggestions — not just "you might want to think about X"
- [ ] After the findings appear, the interview AI can see them and offers to work through them: "Would you like me to update the spec to address these?" or similar
- [ ] The user can then instruct the AI on which suggestions to accept, reject, or refine — same conversational flow as the rest of the interview
- [ ] Multiple review passes can be triggered — each creates a fresh context
- [ ] The system encourages at least one review before the first commit (e.g. a nudge when the user clicks Commit without having run a review)
- [ ] Review results are persisted as chat messages with role "system" and metadata indicating it was an auto-review
