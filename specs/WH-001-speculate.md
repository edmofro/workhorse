# WH-001: AI-driven spec interview

**Status:** Specifying
**Priority:** Urgent
**Team:** Platform

## Summary

An AI-powered interview system that guides users through developing comprehensive acceptance criteria for a feature. The interviewer has remote access to the target codebase to understand how changes fit together, identify edge cases, and find interactions with existing functionality.

## Users

- Product owners refining feature requirements
- Testers bringing attention to edge cases and business rules
- Developers working through technical acceptance criteria

## The interview flow

The user enters the Chat tab on a feature card. The AI has read the card description and has remote access to the target product's codebase.

The conversation is a back-and-forth where the AI:
- Asks targeted questions to elicit requirements
- Probes for edge cases, missing requirements, and contradictions
- Identifies interactions with existing codebase functionality (e.g., "this new field will affect patient merge logic — how should that work?")
- Generates visual mockups inline when helpful to illustrate a concept or clarify a question
- Extracts acceptance criteria from the conversation in real time

At some point — either automatically when the AI judges there's enough detail, or when the user triggers it — the AI drafts a structured spec document. The user can then switch to the Spec tab to edit it directly, while continuing to chat for refinement.

## Acceptance criteria

### Interview experience

- [ ] AI conducts a structured conversation to elicit feature requirements
- [ ] Interview happens within Workhorse's web UI
- [ ] AI asks probing questions — doesn't just accept what the user says
- [ ] The AI has read the card description as starting context
- [ ] Interview can be paused and resumed across sessions
- [ ] Each chat session is between one user and the AI (not multiplayer in the chat itself)
- [ ] AI signals when it believes the spec has reached sufficient detail
- [ ] User can override — mark spec as complete or request more depth

### Codebase awareness

- [ ] AI has remote access to the target product's codebase during the interview (similar to review-hero's Claude-in-GHA pattern or ask-ai's Cursor agent pattern)
- [ ] Proactively identifies interactions with existing functionality when the conversation implies changes
- [ ] Interactions surface as decision points that must be addressed in the spec
- [ ] Understands the project's conventions (informed by CLAUDE.md, llm rules, etc.)
- [ ] Latency of 30-60 seconds per turn is acceptable for codebase exploration

### Visual mockups (optional, not required)

- [ ] AI can generate HTML/CSS mockups inline during the chat to illustrate concepts
- [ ] Mockups help visual people understand what the AI is asking about
- [ ] Mockups are not a required step — used when helpful
- [ ] Mockups appear as preview cards in the chat and are listed in a persistent mockups panel
- [ ] Mockups panel is always accessible regardless of chat scroll position
- [ ] Multiple mockups accumulate over the course of a conversation
- [ ] Clicking a mockup opens the full-screen viewer with floating chat and device toggle
- [ ] Inspector-style component selection for commenting on specific elements

### Spec generation

- [ ] AI automatically drafts a spec document when it has gathered enough information
- [ ] User can also manually trigger spec generation at any time
- [ ] Spec appears in the Spec tab as an editable document
- [ ] AI sees the user's direct edits on the next chat turn
- [ ] AI can suggest revisions to previously extracted criteria based on new information
- [ ] The spec document is collaboratively editable (multiple users can edit, like Google Docs)

## Getting to spec complete

This is the most important part of Workhorse. A spec isn't complete just because the user has answered some questions — it's complete when it's been rigorously examined from multiple angles and the team is confident nothing has been missed.

### Business analysis phase

The AI actively supports business analysis, not just requirements capture:

- [ ] The AI helps identify and document business rules ("what happens when a patient has both an active and expired allergy to the same substance?")
- [ ] Generates flow diagrams for workflows and asks the user to validate them ("here's the flow I understand for lab request → result → review — does this look right?")
- [ ] Identifies decision points that need business rules defined
- [ ] Asks about existing processes and whether the feature changes them
- [ ] Helps decompose vague requirements into concrete, testable criteria

### Edge case discovery

The AI systematically probes for edge cases rather than relying on the user to think of them:

- [ ] Covers error states, empty states, boundary conditions, and concurrent access
- [ ] Identifies data edge cases (nulls, duplicates, large volumes, special characters)
- [ ] Considers permissions and access control implications
- [ ] Explores what happens when upstream dependencies fail or return unexpected data
- [ ] Asks about migration and backwards compatibility for changes to existing features

### Fresh-eyes review passes

After the initial interview, the AI runs independent review passes using contextless agents — fresh perspectives that aren't anchored to the conversation's assumptions:

- [ ] At least one fresh-eyes pass before a spec can be marked complete
- [ ] Each review agent receives only the draft spec and codebase access, not the conversation history
- [ ] Review agents look for: gaps, contradictions, unstated assumptions, missing edge cases, interactions with existing functionality
- [ ] Findings are presented to the user as specific questions or issues to address
- [ ] The user works through each finding — accepting, rejecting, or refining
- [ ] Multiple review passes can be triggered (each with a fresh agent)

### Spec completeness signals

- [ ] The AI tracks which areas have been covered (happy path, edge cases, error handling, permissions, data implications, interactions, business rules)
- [ ] Uncovered areas are surfaced to the user as suggestions for further exploration
- [ ] The AI gives an honest assessment of spec readiness — it pushes back if the user tries to mark complete prematurely
- [ ] "Spec complete" is a meaningful quality bar, not just "the user clicked a button"

## Open questions

- **Interview structure:** Should it follow a guided framework (happy path → edge cases → interactions → permissions → data implications) or be more free-form? Probably guided but flexible.
- **Multi-session context:** When resuming an interview, how much should the AI recap?
- **Spec granularity:** Currently at ticket level. May evolve to handle larger scopes over time.
- **Review pass count:** Is one fresh-eyes pass sufficient, or should there be a minimum of two? Could be configurable per team.
- **Flow diagram format:** What format should generated flow diagrams use? Mermaid in markdown? HTML/SVG mockups? Both?

## Technical notes

- Remote Claude agent for codebase access — no need to clone or pre-index repos
- Conversation history stored in DB, streamed to the client
- Spec document state stored in DB, synced on each edit
- Mockup HTML stored alongside the feature in DB
