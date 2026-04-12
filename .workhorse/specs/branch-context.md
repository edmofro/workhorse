---
title: Branch context and PR management
area: cards
card: WH-078
---

The properties bar includes two controls for branch awareness and pull request lifecycle: a **From property** that shows what the card is based on, and a **PR chip** that manages the pull request. Together they replace the standalone PR bar with compact, always-visible controls that sit alongside the card's other properties.

Mockups: `.workhorse/design/mockups/wh-078/branch-context-split.html`, `.workhorse/design/mockups/wh-078/branch-details.html`

## From property

A property pill in the properties bar (left side, after the existing properties like status, priority, team, assignee). Shows where the card's branch originates from.

- [ ] Displays `From main` when the card branches from the main branch, or `From WH-058` when branching from another card
- [ ] The label text "From" is faint (secondary text colour); the value ("main" or card identifier) uses primary text colour
- [ ] Behaves like other property pills: bare text at rest, subtle rounded background on hover, click opens a dropdown
- [ ] The dropdown is searchable and lists all cards on the same team/project as selectable options, plus "main" at the top
- [ ] Changing the base triggers a rebase. A confirmation modal appears: "Rebase onto [new base]? This may require conflict resolution." with Confirm and Cancel actions
- [ ] The currently selected item in the dropdown shows an update affordance when newer changes are available upstream: an up-arrow count indicator (e.g. `↑4`) and an "Update" action inline on that item
- [ ] Clicking "Update" triggers a rebase onto the latest upstream. The first update on a card applies silently if it resolves cleanly. Subsequent updates show a confirmation prompt before proceeding
- [ ] The From property is visible in all card views (card home, chat, artifact mode), consistent with other properties

### Upstream update indicator

- [ ] When the upstream branch (main or parent card) has newer commits than the card's current base, the From property shows an up-arrow with a count (e.g. `↑4`) indicating how many commits are available
- [ ] The up-arrow indicator uses the accent colour to draw attention without being confused with CI status dots or card status dots
- [ ] When no newer commits are available, no indicator is shown — the property displays cleanly as `From main` or `From WH-058`

## PR chip

A compact chip in the properties bar, positioned to the left of the journey section. Manages the full pull request lifecycle.

### Chip states

The chip progresses through these states based on the card's branch and PR status:

- [ ] **No chip** — the card has no code changes outside `.workhorse/`. Nothing is shown
- [ ] **Create PR button** — code changes exist but no PR has been created. Displays as a proper button (`Create PR`) using design system button sizing. Clicking immediately creates a PR via the create-pr skill — no popover or confirmation
- [ ] **Open PR** — a PR exists and is open. Displays the PR number with a green pull-request icon (e.g. `⑃ #142`). Clicking opens the PR popover
- [ ] **Open PR, behind upstream** — a PR exists but the upstream has newer changes. Displays the PR number with the green pull-request icon plus the up-arrow count (e.g. `⑃ #142 ↑4`). Clicking opens the PR popover
- [ ] **Updating** — a rebase or update is in progress. The chip shows a spinner alongside the PR number
- [ ] **Merged PR** — the PR has been merged. Displays the PR number with a muted merge icon (e.g. `⑂ #142`). Clicking opens the PR popover showing merged state details
- [ ] **Merged PR with new changes** — the PR was merged but the card has new commits since the merge. Displays `⑂ #142 | 1 new`. Clicking opens the PR popover with the "Prepare new PR" action

### PR popover

Clicking the chip (in any state except "Create PR") opens a popover anchored to the chip.

- [ ] **Open PR popover** shows: PR title, link to view on GitHub (opens in new tab), CI status summary, and branch details (collapsed by default, see below)
- [ ] **Merged PR popover** shows: PR title, merge timestamp, link to view on GitHub, and branch details
- [ ] **Merged with new changes popover** shows: the same merged details, plus a count of post-merge commits and a "Prepare new PR" action button
- [ ] The popover closes on click outside, Escape, or when an action is triggered
- [ ] Popover uses design system styling: `shadow-lg`, `border-radius: 12px`, `border-default`

### Squash-merge-then-fix flow

When a PR has been merged (including squash-merged) and the card has subsequent commits, the system detects these post-merge changes automatically.

- [ ] The chip transitions to the "merged with new changes" state, showing the count of new commits
- [ ] The PR popover surfaces a "Prepare new PR" action
- [ ] "Prepare new PR" cherry-picks the post-merge commits onto a fresh branch from main, then creates a new PR automatically
- [ ] The chip transitions to the new PR's open state once created

## Branch details

A collapsible section at the bottom of the PR popover. Provides power-user diagnostics for users comfortable with branch operations. Collapsed by default.

- [ ] **Branch name** — displayed in monospace, with a copy-to-clipboard action
- [ ] **Local changes** — lists uncommitted file changes. If present, shows a "Commit" action that auto-generates a commit message and commits
- [ ] **Unpushed commits** — lists commits not yet on the remote. If present, shows a "Push" action
- [ ] **Remote status** — indicates whether the remote has commits not yet pulled. If present, shows a "Pull" action. Pulling uses the same conflict resolution as upstream updates
- [ ] **Merged state** — when the PR is merged, shows the merge commit and timestamp

## Conflict resolution

When a rebase or pull encounters conflicts, the system uses an AI subagent to resolve them automatically.

- [ ] The server performs the git rebase or merge operation
- [ ] If the operation completes cleanly, the result is committed silently
- [ ] If conflicts are detected, a subagent is spawned to resolve them
- [ ] The subagent receives: the card's journal summary, card description, commit history, and an instruction to explore the current spec and code diffs to understand intent
- [ ] The subagent has allowlisted bash access within the card's worktree: read commands (`git log`, `git show`, `git diff`, `git blame`) and resolution commands (`git checkout`, `git rebase --continue`, `git add`, `git commit`). Worktree isolation prevents cross-card impact
- [ ] The server validates the subagent's result: no conflict markers may remain in any file. If validation passes, the server pushes the resolved commits
- [ ] If the subagent fails to resolve cleanly, the update fails and the user sees an error message. No partial results are committed
- [ ] During resolution, the chip shows the updating/spinner state

## Update status persistence

- [ ] The card model stores an `updateStatus` field with values: `idle`, `updating`, or `failed`
- [ ] This field persists across page refreshes — the spinner state survives navigation and reload
- [ ] The `failed` state surfaces an error indicator on the chip, with details available in the popover
- [ ] Future use: the persisted status can block conversation turns during updates if needed (not implemented initially — updates and chat run concurrently)

## Real-time updates

- [ ] Chip state, From property badge, and branch details stay current via the same socket/polling system used by the artifacts sidebar
- [ ] Changes to PR status, upstream commit counts, and merge state are reflected without requiring a page refresh

## Cross-references

- `workflow-orchestration.md` — the create-pr skill is triggered by the PR chip's "Create PR" button; the fix-ci skill is available from the PR popover when CI fails
- `dependencies.md` — the From property is the user-facing surface for card dependencies; changing the base is equivalent to changing the dependency
- `commit-specs.md` — auto-commit behaviour applies to branch operations; the "under the hood" branch management is surfaced through the From property and branch details
- `card-navigation.md` — the properties bar layout that contains both the From property and PR chip
- `github.md` — PR creation and status tracking use the GitHub integration's OAuth token and API calls
