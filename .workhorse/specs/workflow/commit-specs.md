---
title: Commit specs to codebase
area: workflow
card: WH-005
status: draft
---

Specs are auto-committed to the card's git branch on every change. There is no manual "Commit" button — Workhorse saves continuously. The user never sees branch names, SHAs, or git operations. A card may create new specs and modify existing ones — all committed to the same branch.

For developers picking up the work, Workhorse generates an implementation prompt that handles the checkout and tells their AI what changed.

## Auto-commit (user's perspective)

- [ ] Every agent turn auto-commits changed files to the card's branch with an AI-generated descriptive message
- [ ] Every user edit auto-commits when the user leaves edit mode (clicks "Done editing" or navigates away)
- [ ] The user is prompted for a brief change description (pre-filled by AI). They can accept, edit, or skip
- [ ] Committed specs do not include mockup HTML
- [ ] If the card depends on another card (see WH-019), commits are ordered correctly
- [ ] No explicit "save" or "commit" action — work is always saved

## Per-file version history

Since every change has a descriptive commit message, each file has a navigable edit history:

- [ ] "History" affordance per file in the spec tab
- [ ] Shows: relative timestamp, author (user name or "Interviewer"), change description
- [ ] Click a version to see the file at that point
- [ ] Diff between any two versions
- [ ] Powered by `git log -- {filepath}` under the hood

## Marking specs ready

The old "Commit" button is replaced by a status transition. Since work is always committed, "mark ready" is a quality gate, not a save action:

- [ ] "Mark ready" transitions the card from `SPECIFYING` → `IMPLEMENTING`
- [ ] This is a status change, not a git operation — specs are already on the branch
- [ ] No PR is created at this point. The implementation phase creates PRs when the developer is ready
- [ ] The AI pushes back if areas remain uncovered — this is a quality bar, not just a button click
- [ ] Presented as a secondary action (status dropdown or subtle button), not a prominent CTA — the normal flow is iterating until the spec is solid
- [ ] Backward transition allowed: `IMPLEMENTING` → `SPECIFYING` if specs need rework

## Under the hood (invisible to user)

- [ ] Workhorse creates a branch following the product's conventions on first spec activity (from CLAUDE.md, llm rules)
- [ ] Subsequent changes push new commits to the same branch automatically
- [ ] Dependent cards branch off parent card branches; rebasing is automatic
- [ ] Branch is the source of truth; worktree on disk is a recreatable cache (see agent-sdk-interview spec for recovery details)

## Collaborate with agent button

Moved to the agent SDK interview spec (`.workhorse/specs/interview/agent-sdk-interview.md`). The split dropdown button now appears in both `SPECIFYING` and `IMPLEMENTING` modes, generating a phase-appropriate prompt. See that spec for full details on UX, prompt design, and examples.

The key change from the original design: the button is no longer implementation-only. It appears during specifying too, enabling external Claude Code sessions to collaborate on spec development. The prompt adapts to the card's current status.

## Open questions

> **Draft PRs:** Should the implementation phase create PRs as drafts initially?

> **Change description UX:** When a user leaves edit mode, the AI pre-fills a change description. What's the right UX — inline input, modal, or toast with edit option? Should "skip" mean a generic message or no description?

> **Commit granularity for agents:** Should the agent commit after every tool call (Write/Edit), or batch all changes at the end of a turn? Per-tool-call gives finer history but more noise. End-of-turn is simpler but loses intermediate states.
