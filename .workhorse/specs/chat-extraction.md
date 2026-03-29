---
title: Chat-to-data extraction pipeline
area: workflow
status: draft
---

Connects the AI chat interview to the rest of the system by automatically persisting mockups and specs extracted from chat responses and populating the activity log.

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
