---
title: Chat-to-data extraction pipeline
area: workflow
status: draft
---

Connects the AI chat interview to the rest of the system by automatically persisting mockups and specs extracted from chat responses, and surfaces the review panel and activity log.

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

## Fresh-eyes review panel

- [ ] The ReviewPanel component is rendered in the feature detail view, accessible from the Spec tab
- [ ] Position: below the spec editor or as a collapsible panel alongside it
- [ ] The "Run review" button is disabled until at least one spec exists (current behaviour of the component)
- [ ] Review results appear inline and are persisted as system messages with metadata
- [ ] Multiple review passes are allowed — each run creates a fresh review

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
