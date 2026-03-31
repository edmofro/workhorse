---
title: Commit specs to codebase
area: workflow
card: WH-005
---

Specs are auto-committed to the card's git branch on every change. The user never sees branch names, SHAs, or git operations. A card may create new specs and modify existing ones — all committed to the same branch.

For developers picking up the work, Workhorse generates an implementation prompt that handles the checkout and tells their AI what changed.

## Auto-commit (user's perspective)

- [ ] Every agent turn auto-commits changed files to the card's branch with an AI-generated descriptive message
- [ ] Every user edit auto-commits when the user leaves edit mode (clicks "Done editing" or navigates away)
- [ ] The UI prompts for a brief change description (pre-filled by AI). User can accept, edit, or skip
- [ ] Committed specs do not include mockup HTML
- [ ] If the card depends on another card (see WH-019), commits are ordered correctly

## Changes view

What the user cares about most is changes _in this card_ — what's different from the base branch. Every artifact (spec, code) has a **Changes** toggle that shows the diff:

- [ ] **Spec changes:** inline tracked-changes view (additions highlighted, removals struck through) — readable by product people, not a code diff
- [ ] **Code changes:** unified diff view (like GitHub) with line numbers and colour-coded additions/deletions
- [ ] Changes toggle defaults to **on** when opening any artifact
- [ ] Switching to edit mode automatically switches to the File view

The per-file version history (git log per file) is available under the hood but not exposed in the UI — the changes view against the base branch is the primary way users understand what's different.

## Status transitions

Status changes (including `SPECIFYING` → `IMPLEMENTING`) are handled via the status dropdown on the card view — no dedicated button. This avoids conditionally-rendered topbar buttons that flash in and shift the layout.

- [ ] Status dropdown on the card view handles all transitions including `SPECIFYING` → `IMPLEMENTING`
- [ ] No PR is created at this point. The implementation phase creates PRs when the developer is ready
- [ ] Backward transition allowed: `IMPLEMENTING` → `SPECIFYING` if specs need rework

## Under the hood (invisible to user)

- [ ] Workhorse creates a branch following the project's conventions on first spec activity (from CLAUDE.md, llm rules)
- [ ] Subsequent changes push new commits to the same branch automatically
- [ ] Dependent cards branch off parent card branches; rebasing is automatic
- [ ] Branch is the source of truth; worktree on disk is a recreatable cache (see agent-sdk-session spec for recovery details)

## Collaborate with agent button

See the agent SDK session spec (`.workhorse/specs/agent-sdk-session.md`) for full details. The split dropdown button appears in both `SPECIFYING` and `IMPLEMENTING` modes, generating a phase-appropriate prompt for external Claude Code sessions.

## Open questions

> **Draft PRs:** Should the implementation phase create PRs as drafts initially?

> **Change description UX:** When a user leaves edit mode, the AI pre-fills a change description. What's the right UX — inline input, modal, or toast with edit option? Should "skip" mean a generic message or no description?

> **Commit granularity for agents:** Should the agent commit after every tool call (Write/Edit), or batch all changes at the end of a turn? Per-tool-call gives finer history but more noise. End-of-turn is simpler but loses intermediate states.
