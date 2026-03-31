---
title: AI-driven spec interview
area: agent
card: WH-001
---

An AI-powered interview system that guides users through developing comprehensive acceptance criteria. The agent has remote access to the target codebase to understand how changes fit together, identify edge cases, and find interactions with existing functionality.

## Users

Product owners refining requirements, testers bringing attention to edge cases and business rules, and developers working through technical acceptance criteria.

## Interview experience

- [ ] AI conducts a structured conversation to elicit requirements
- [ ] Interview happens within Workhorse's web UI
- [ ] AI asks probing questions — doesn't just accept what the user says
- [ ] The AI has read the card description as starting context
- [ ] Interview can be paused and resumed across sessions
- [ ] Each chat session is between one user and the AI (not multiplayer in the chat itself)
- [ ] AI signals when it believes the spec has reached sufficient detail
- [ ] User can override — mark spec as complete or request more depth

## Codebase awareness

- [ ] AI has remote access to the target project's codebase during the interview (similar to review-hero's Claude-in-GHA pattern or ask-ai's Cursor agent pattern)
- [ ] Proactively identifies interactions with existing functionality when the conversation implies changes
- [ ] Interactions surface as decision points that must be addressed in the spec
- [ ] Understands the project's conventions (informed by CLAUDE.md, llm rules, etc.)
- [ ] Latency of 30-60 seconds per turn is acceptable for codebase exploration

## Visual mockups

- [ ] AI proactively generates HTML/CSS mockups during the chat whenever a visual would help illustrate the concept being discussed
- [ ] Mockups help visual people understand what the AI is asking about
- [ ] Mockups are not a required step — generated when helpful, without waiting to be asked
- [ ] Mockups appear as preview cards in the chat and are listed in the files panel
- [ ] Files panel is always accessible regardless of chat scroll position
- [ ] Multiple mockups accumulate over the course of a conversation
- [ ] Clicking a mockup opens it as an artifact (chat left, mockup right) — same layout as specs

## Spec generation

- [ ] AI automatically drafts a spec document when it has gathered enough information
- [ ] User can also manually trigger spec generation at any time
- [ ] Spec appears in the files panel and can be opened as an artifact (chat left, spec right) for editing
- [ ] AI sees the user's direct edits on the next chat turn
- [ ] AI can suggest revisions to previously extracted criteria based on new information
- [ ] The spec document is collaboratively editable (multiple users can edit, like Google Docs)

## Business analysis

- [ ] The AI helps identify and document business rules ("what happens when a patient has both an active and expired allergy to the same substance?")
- [ ] Generates flow diagrams for workflows and asks the user to validate them
- [ ] Identifies decision points that need business rules defined
- [ ] Asks about existing processes and whether the feature changes them
- [ ] Helps decompose vague requirements into concrete, testable criteria

## Edge case discovery

- [ ] Covers error states, empty states, boundary conditions, and concurrent access
- [ ] Identifies data edge cases (nulls, duplicates, large volumes, special characters)
- [ ] Considers permissions and access control implications
- [ ] Explores what happens when upstream dependencies fail or return unexpected data
- [ ] Asks about migration and backwards compatibility for changes to existing functionality

## Automated spec review

The user can trigger an auto-review at any point — a fresh-context AI agent reviews the specs, mockups, and all existing project specs, then posts findings into the chat for the session agent to help work through. See `workflow/auto-review.md` for full details.

## Spec completeness signals

- [ ] The AI tracks which areas have been covered (happy path, edge cases, error handling, permissions, data implications, interactions, business rules)
- [ ] Uncovered areas are surfaced to the user as suggestions for further exploration
- [ ] The AI gives an honest assessment of spec readiness — it pushes back if the user tries to mark complete prematurely
- [ ] "Spec complete" is a meaningful quality bar, not just "the user clicked a button"

## Open questions

> **Interview structure:** Should it follow a guided framework (happy path, edge cases, interactions, permissions, data implications) or be more free-form? Probably guided but flexible.

> **Multi-session context:** When resuming an interview, how much should the AI recap?

> **Spec granularity:** Currently at ticket level. May evolve to handle larger scopes over time.

> **Review pass count:** Is one fresh-eyes pass sufficient, or should there be a minimum of two? Could be configurable per team.

> **Flow diagram format:** What format should generated flow diagrams use? Mermaid in markdown? HTML/SVG mockups? Both?
