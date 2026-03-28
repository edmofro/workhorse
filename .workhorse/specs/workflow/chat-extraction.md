---
title: Chat-to-data extraction pipeline
area: workflow
status: draft
---

Connects the AI chat interview to the rest of the system by automatically persisting mockups and specs extracted from chat responses, integrating the automated spec review into the chat flow, and populating the activity log.

## Mockup extraction and persistence

- [ ] After each assistant message is saved, the system runs mockup detection on the response content
- [ ] Each detected mockup block is saved as a Mockup record linked to the card
- [ ] Duplicate detection prevents re-saving the same mockup if the title and HTML match an existing record
- [ ] The mockups panel renders persisted mockups and is accessible from the card detail view
- [ ] Mockups panel is visible on the Chat tab as a collapsible side panel, or on the Card tab alongside metadata

## Spec extraction and persistence

- [ ] After each assistant message is saved, the system runs spec detection on the response content
- [ ] Each detected spec block is upserted as a FeatureSpec record (matched by card + file path)
- [ ] If a spec block matches an existing FeatureSpec's title/area, the content is updated rather than creating a duplicate
- [ ] The Spec tab reflects extracted specs immediately (user can then edit them further)
- [ ] A visual indicator in the chat message marks which spec blocks have been saved (e.g. green accent on the spec extraction block)

## Automated spec review

A fresh-context AI agent reviews the draft specs and posts its findings into the chat. The user doesn't leave the conversation — the review results land as a message, the interview AI sees them, and they work through the suggestions together.

### Triggering a review

- [ ] An "Auto-review" button is available on both the Chat tab and the Spec tab (e.g. in the chat input area and in the spec editor toolbar)
- [ ] The button label communicates that this is an automated process, not a screen the user has to fill in — something like "Auto-review" or "Check spec"
- [ ] The button is disabled until at least one spec exists on the card
- [ ] Clicking it spins up a fresh AI context with no access to the conversation history

### What the review agent receives

- [ ] All draft specs on the card
- [ ] All mockups on the card
- [ ] Codebase access (same level as the interview agent)
- [ ] The full set of existing project specs from the main branch — not just the ones attached to this card

### What the review agent checks

- [ ] Gaps in the draft specs: missing edge cases, error states, permissions, data implications
- [ ] Contradictions and unstated assumptions within the draft specs
- [ ] Interactions with existing functionality that haven't been addressed
- [ ] **Cross-spec impact:** scans through every existing project spec to find areas that the new or changed specs would affect but that haven't been updated by this card. For example, if a new "allergies" spec changes how patient data is structured, the review should flag `patient/merge.md` if it references patient data but hasn't been included on the card. This is one of several review responsibilities — the agent should flag substantive impacts, not speculate about tangential connections

### How results appear

- [ ] Findings are posted into the chat as a system message (visually distinct from user and assistant messages)
- [ ] The message includes specific, actionable suggestions — not just "you might want to think about X"
- [ ] After the findings appear, the interview AI can see them and offers to work through them: "Would you like me to update the spec to address these?" or similar
- [ ] The user can then instruct the AI on which suggestions to accept, reject, or refine — same conversational flow as the rest of the interview
- [ ] Multiple review passes can be triggered — each creates a fresh context
- [ ] The system encourages at least one review before the first commit (e.g. a nudge when the user clicks Commit without having run a review)
- [ ] Review results are persisted as SpecMessage records with role "system" and metadata indicating it was an auto-review

## Activity logging

- [ ] Card creation records a "created" activity with the creating user
- [ ] Status changes record a "status_changed" activity with old and new status
- [ ] Spec creation and updates record "spec_updated" activities
- [ ] Committing specs records a "committed" activity with branch and PR URL
- [ ] Dependency changes record "dependency_added" / "dependency_removed" activities
- [ ] The Card tab's activity timeline displays these records

## Open questions

> **Mockup panel placement:** Should mockups appear on the Chat tab, the Card tab, or both? The spec (WH-003) suggests a persistent mockups panel that's always accessible.

> **Spec extraction timing:** Should spec extraction happen on every assistant message, or only when the AI explicitly outputs a spec block?
