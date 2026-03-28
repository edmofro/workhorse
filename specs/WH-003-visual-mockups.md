# WH-003: Visual mockups

**Status:** Not started
**Priority:** Medium
**Team:** Platform

## Summary

The AI generates HTML/CSS mockups during the chat conversation. They appear in the chat where they were created, and are also listed in a persistent mockups panel so they're always accessible regardless of scroll position. Clicking a mockup opens a full-screen viewer.

There may be many mockups over the course of specifying a feature: a date picker detail, a full page layout, a merge conflict dialog, etc.

## Context

"The tricky bit is that we generally refine things with a reference point of a visual design in Figma, and we understand the specs more and more as we develop it and see it coming to life. That's a harder process with just words."

## How mockups are introduced

- The AI proactively generates one when it would help illustrate a concept
- The AI asks "would a mockup help here?" when discussing UI-heavy features
- The user requests one in the chat ("can you mock that up?")

## Acceptance criteria

### In the chat

- [ ] Mockups appear as compact preview cards in the conversation where they were generated
- [ ] Each mockup has a title describing what it shows (e.g., "Patient allergies — list view")
- [ ] Multiple mockups accumulate over the course of a conversation

### Mockups panel

- [ ] A persistent mockups panel lists all mockups for this card (similar to Claude's artifacts panel)
- [ ] The panel is accessible at any time, regardless of scroll position in the chat
- [ ] Each entry shows the mockup title and a thumbnail or icon
- [ ] Clicking an entry opens the full-screen mockup viewer
- [ ] The panel is also visible in the narrowed chat sidebar during spec editing

### Full-screen viewer

- [ ] Clicking a mockup (from chat or mockups panel) opens a full-screen view
- [ ] Mockup gets maximum screen real estate
- [ ] Subtle border/background to distinguish from the app itself
- [ ] Floating chat (bottom-centre) for discussing the mockup
- [ ] Device toggle (desktop/tablet/mobile)
- [ ] Inspector-style component selection for commenting on specific elements
- [ ] Inspector-style live CSS editing: select an element, tweak properties, see changes in real time (same as design library explorer)

### Mockups are HTML/CSS

- [ ] Rendered inline, not images
- [ ] The AI generates them the same way a developer would mock up a UI

### Mockup lifecycle

#### WIP state

- [ ] WIP mockups are stored in the database only — not yet committed to the codebase
- [ ] The user iterates on mockups through the chat conversation

#### Committing mockups

- [ ] Mockups can be marked for commit alongside the card's specs
- [ ] Each committed mockup is linked to a specific spec it represents
- [ ] Committed mockups are placed in `.workhorse/design/mockups/<card-id>/`
- [ ] Committed mockups are organised by card number (e.g., `mockups/WH-042/allergy-list.html`)
- [ ] Each mockup includes an HTML comment header referencing the spec(s) it represents:

```html
<!--
  spec: patient/allergies.md
  card: WH-042
  title: Allergy list — main view
-->
```

#### Reference direction

- [ ] Specs do NOT reference mockups — mockups may be temporary and deleted after implementation
- [ ] Mockups reference specs via their HTML comment header, so the AI can search for relevant mockups when implementing a given spec

#### After implementation

- [ ] Mockups may be deleted after implementation to keep the design directory clean
- [ ] This is at the team's discretion — some may be worth keeping as documentation

### As implementation context

- [ ] Mockup HTML is included in the downloadable implementation prompt
- [ ] AI agents search for relevant mockups by spec path when implementing
- [ ] Mockups can be deleted without breaking any spec references
