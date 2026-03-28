# WH-005: Commit specs to codebase

**Status:** Not started
**Priority:** High
**Team:** Platform

## Summary

When specs are ready (or at any point during development), the user hits "Commit". Workhorse handles everything — creating branches, PRs, naming them according to the product's conventions, and pushing updates. The user never sees branch names or git operations. A card may create new specs and modify existing ones — all committed together.

For developers picking up the work, Workhorse generates an implementation prompt that handles the checkout and tells their AI what changed.

## Acceptance criteria

### Committing (user's perspective)

- [ ] User clicks "Commit" on the card
- [ ] All spec documents on the card are saved to the product's codebase
- [ ] Subsequent spec edits are saved automatically (no re-commit needed, or a simple "Update" button)
- [ ] A PR is visible on GitHub for reviewers, but the user doesn't need to think about it
- [ ] Committed specs do not include mockup HTML
- [ ] If the card depends on another card (see WH-019), commits are ordered correctly

### Under the hood (invisible to user)

- [ ] Workhorse creates a branch following the product's conventions (from CLAUDE.md, llm rules)
- [ ] A PR is created with a title following the product's conventions
- [ ] Subsequent edits push new commits to the same branch/PR
- [ ] A link to view the PR on GitHub is shown next to the Commit button once a PR exists
- [ ] Dependent cards branch off parent card branches; rebasing is automatic

### Implementation handoff

- [ ] User marks a feature as "Spec complete"
- [ ] This generates a downloadable implementation prompt (.md file)
- [ ] The prompt includes:
  - Checkout command for the branch
  - Instruction to diff specs against main to see what's new and changed
  - Summary of which specs are new vs modified
  - Any mockup HTML generated during the interview
  - Relevant codebase context and conventions
- [ ] The prompt focuses the implementing AI on the delta, not the entire spec
- [ ] If too large for clipboard, it's a downloadable file

## Open questions

- ~~Where should specs live in the codebase?~~ Resolved: `.workhorse/specs/`
- Should the PR be created as draft initially?
