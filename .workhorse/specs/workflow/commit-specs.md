---
title: Commit specs to codebase
area: workflow
card: WH-005
status: draft
---

When specs are ready (or at any point during development), the user hits "Commit". Workhorse handles everything — creating branches, PRs, naming them according to the product's conventions, and pushing updates. The user never sees branch names or git operations. A card may create new specs and modify existing ones — all committed together.

For developers picking up the work, Workhorse generates an implementation prompt that handles the checkout and tells their AI what changed.

## Committing (user's perspective)

- [ ] User clicks "Commit" on the card
- [ ] All spec documents on the card are saved to the product's codebase
- [ ] After initial commit, the "Commit spec" button remains but is disabled until there are new local changes to push
- [ ] When specs are edited after an initial commit, the button re-enables so the user can push updates
- [ ] A PR is visible on GitHub for reviewers, but the user doesn't need to think about it
- [ ] Committed specs do not include mockup HTML
- [ ] If the card depends on another card (see WH-019), commits are ordered correctly

## Under the hood (invisible to user)

- [ ] Workhorse creates a branch following the product's conventions (from CLAUDE.md, llm rules)
- [ ] A PR is created with a title following the product's conventions
- [ ] Subsequent edits push new commits to the same branch/PR
- [ ] A link to view the PR on GitHub is shown next to the Commit button once a PR exists
- [ ] Dependent cards branch off parent card branches; rebasing is automatic

## Collaborate with agent button

Moved to the agent SDK interview spec (`.workhorse/specs/interview/agent-sdk-interview.md`). The split dropdown button now appears in both `SPECIFYING` and `IMPLEMENTING` modes, generating a phase-appropriate prompt. See that spec for full details on UX, prompt design, and examples.

The key change from the original design: the button is no longer implementation-only. It appears during specifying too, enabling external Claude Code sessions to collaborate on spec development. The prompt adapts to the card's current status.

## Open questions

> **Draft PRs:** Should the PR be created as draft initially?

> **Dirty detection:** With the worktree-based architecture (see agent-sdk-interview spec), dirty detection uses `git status` / `git diff` in the worktree rather than comparing DB content.
