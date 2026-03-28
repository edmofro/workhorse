---
title: Chat-to-data extraction pipeline
area: workflow
status: draft
---

Connects the AI chat interview to the rest of the system by automatically persisting mockups and specs extracted from chat responses, integrating the fresh-eyes review into the chat flow, and populating the activity log.

## Mockup extraction and persistence

- [ ] After each assistant message is saved, the system runs mockup detection on the response content
- [ ] Each detected mockup block is saved as a Mockup record linked to the feature
- [ ] Duplicate detection prevents re-saving the same mockup if the title and HTML match an existing record
- [ ] The MockupsPanel (already built) renders persisted mockups and is accessible from the feature detail view
- [ ] Mockups panel is visible on the Chat tab as a collapsible side panel, or on the Card tab alongside metadata

## Spec extraction and persistence

- [ ] After each assistant message is saved, the system runs spec detection on the response content
- [ ] Each detected spec block is upserted as a FeatureSpec record (matched by feature + file path)
- [ ] If a spec block matches an existing FeatureSpec's title/area, the content is updated rather than creating a duplicate
- [ ] The Spec tab reflects extracted specs immediately (user can then edit them further)
- [ ] A visual indicator in the chat message marks which spec blocks have been saved (e.g. green accent on the spec extraction block)

## Fresh-eyes review as a chat action

The fresh-eyes review is not a separate panel — it's a step in the chat flow. A fresh-context AI agent reviews the draft specs (without access to conversation history) and posts its findings directly into the chat as a system message. Think of it as inviting a colleague to glance over your work.

- [ ] A "Review with fresh eyes" button is available in the chat UI (e.g. as an action in the chat input area or a button above the conversation)
- [ ] The button is disabled until at least one spec exists on the card
- [ ] Clicking it spins up a fresh AI context that receives only the draft spec(s) and codebase access — no conversation history
- [ ] The review agent checks for: gaps, contradictions, unstated assumptions, missing edge cases, interactions with existing functionality, and also reviews all other product specs to find places that might be impacted but haven't been updated by this card
- [ ] Findings are posted into the chat as a system message (visually distinct from user and assistant messages)
- [ ] After the findings appear, the normal interview AI can see them and help the user work through each one
- [ ] Multiple review passes can be triggered — each creates a fresh context
- [ ] The system encourages at least one fresh-eyes pass before the first commit (e.g. a prompt or nudge when the user clicks Commit without having run a review)
- [ ] Review results are persisted as SpecMessage records with role "system" and metadata indicating it was a fresh-eyes review

## Activity logging

- [ ] Feature creation records a "created" activity with the creating user
- [ ] Status changes record a "status_changed" activity with old and new status
- [ ] Spec creation and updates record "spec_updated" activities
- [ ] Committing specs records a "committed" activity with branch and PR URL
- [ ] Dependency changes record "dependency_added" / "dependency_removed" activities
- [ ] The Card tab's existing activity timeline displays these records (already built, just needs data)

## Open questions

> **Mockup panel placement:** Should mockups appear on the Chat tab, the Card tab, or both? The spec (WH-003) suggests a persistent mockups panel that's always accessible.

> **Spec extraction timing:** Should spec extraction happen on every assistant message, or only when the AI explicitly outputs a spec block? Current detection logic only fires on explicit ` ```spec ` blocks, which seems correct.
