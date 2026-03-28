---
title: Commit specs to codebase
area: workflow
card: WH-005
status: draft
---

When specs are ready (or at any point during development), the user hits "Commit". Workhorse handles everything — creating branches, PRs, naming them according to the project's conventions, and pushing updates. The user never sees branch names or git operations. A card may create new specs and modify existing ones — all committed together.

For developers picking up the work, Workhorse generates an implementation prompt that handles the checkout and tells their AI what changed.

## Committing (user's perspective)

- [ ] User clicks "Commit" on the card
- [ ] All spec documents on the card are saved to the project's codebase
- [ ] After initial commit, the "Commit spec" button remains but is disabled until there are new local changes to push
- [ ] When specs are edited after an initial commit, the button re-enables so the user can push updates
- [ ] A PR is visible on GitHub for reviewers, but the user doesn't need to think about it
- [ ] Committed specs do not include mockup HTML
- [ ] If the card depends on another card (see WH-019), commits are ordered correctly

## Under the hood (invisible to user)

- [ ] Workhorse creates a branch following the project's conventions (from CLAUDE.md, llm rules)
- [ ] A PR is created with a title following the project's conventions
- [ ] Subsequent edits push new commits to the same branch/PR
- [ ] A link to view the PR on GitHub is shown next to the Commit button once a PR exists
- [ ] Dependent cards branch off parent card branches; rebasing is automatic

## Launch Claude Code session

When specs are committed and the card is marked "Spec complete", the developer can start implementing. Rather than downloading a large handoff file, Workhorse generates a short clipboard prompt and optionally opens Claude Code.

### UX flow

- [ ] The implementation launch button only appears when the card status is Spec complete
- [ ] Button is a split button with dropdown (like GitHub's merge strategy button on PR reviews)
- [ ] Two options in the dropdown: "Copy prompt" and "Launch Claude Code"
- [ ] "Copy prompt" copies the implementation prompt to clipboard
- [ ] "Launch Claude Code" copies the prompt to clipboard AND opens `claude.ai/code` in a new tab
- [ ] The button face shows whichever option the user chose last time (remembered across sessions)
- [ ] Default for first-time users is "Launch Claude Code"
- [ ] A toast confirms the action: "Prompt copied" or "Prompt copied — opening Claude Code"
- [ ] The "Commit spec" button remains available alongside the implementation button, but is disabled when there are no uncommitted spec changes
- [ ] "View PR" link also remains visible once a PR exists

### Prompt design

The prompt is short and self-contained — it tells the AI where to look, not what the specs say. The AI reads the specs and mockups from the codebase itself.

- [ ] Prompt fits comfortably in clipboard (target: under 500 characters for typical cards)
- [ ] Includes: git fetch/checkout commands for the spec branch
- [ ] Includes: which spec files are new vs updated, as file paths only
- [ ] Includes: `git diff` command between base branch and spec branch to see the delta
- [ ] References mockup file paths under `.workhorse/design/mockups/` rather than inlining HTML
- [ ] Does not include spec content, chat history, or mockup HTML
- [ ] Ends with a clear instruction: read the specs, review the diff, then implement

### Example prompt

```
git fetch origin spec/wh-042-patient-merge
git checkout spec/wh-042-patient-merge

New specs:
- .workhorse/specs/patient/merge-patients.md
- .workhorse/specs/patient/merge-conflicts.md

Updated specs:
- .workhorse/specs/patient/patient-search.md

Mockups:
- .workhorse/design/mockups/patient-merge.html

Review the diff to see what changed:
git diff main...spec/wh-042-patient-merge -- .workhorse/

Read the specs and mockups, then implement all acceptance criteria.
```

## Open questions

> **Draft PRs:** Should the PR be created as draft initially?

> **Toast library:** Do we have a toast/notification system yet, or do we need to add one for the "Prompt copied" feedback?

> **Dirty detection:** How does the system know when there are uncommitted spec changes? Compare against the last committed version, or check the codebase directly?
