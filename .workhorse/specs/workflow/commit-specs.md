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
- [ ] Subsequent spec edits are saved automatically (no re-commit needed, or a simple "Update" button)
- [ ] A PR is visible on GitHub for reviewers, but the user doesn't need to think about it
- [ ] Committed specs do not include mockup HTML
- [ ] If the card depends on another card (see WH-019), commits are ordered correctly

## Under the hood (invisible to user)

- [ ] Workhorse creates a branch following the product's conventions (from CLAUDE.md, llm rules)
- [ ] A PR is created with a title following the product's conventions
- [ ] Subsequent edits push new commits to the same branch/PR
- [ ] A link to view the PR on GitHub is shown next to the Commit button once a PR exists
- [ ] Dependent cards branch off parent card branches; rebasing is automatic

## Launch Claude Code session

When specs are committed, the developer needs to start implementing. Rather than downloading a large handoff file, Workhorse generates a short clipboard prompt and opens Claude Code in one click.

### UX flow

- [ ] After commit, "Commit spec" button is replaced by "View PR" link and a "Launch Claude Code" button
- [ ] Clicking "Launch Claude Code" copies a short prompt to clipboard and opens `claude.ai/code` in a new tab
- [ ] A toast confirms: "Prompt copied — paste it in Claude Code"
- [ ] The download button is removed (replaced by the launch button)

### Prompt design

The prompt is short and self-contained — it tells the AI where to look, not what the specs say. The AI reads the specs and mockups from the codebase itself.

- [ ] Prompt fits comfortably in clipboard (target: under 500 characters for typical features)
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
