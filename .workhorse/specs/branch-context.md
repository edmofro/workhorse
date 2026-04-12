---
title: Branch context and PR management
area: cards
card: WH-078
---

The **From property** in the properties bar shows what the card is based on. The **PR section** at the top of the artifacts sidebar manages the pull request lifecycle — status, CI, branch diagnostics, and actions. Together they replace the standalone PR bar.

Mockups: `.workhorse/design/mockups/wh-078/branch-context-split.html`, `.workhorse/design/mockups/wh-078/pr-sidebar-interactive.html`

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

## PR section in artifacts sidebar

A section at the top of the artifacts sidebar (above Specs, Mockups, Code changes) that manages the full pull request lifecycle. This replaces the standalone PR bar and the properties bar chip.

### Collapsed bar states

The PR row at the top of the sidebar progresses through these states:

- [ ] **No section** — the card has no code changes outside `.workhorse/`. The PR section is hidden entirely
- [ ] **Create PR button** — code changes exist but no PR has been created. A left-aligned `Create PR` button using design system button sizing. Clicking immediately creates a PR via the create-pr skill — no confirmation
- [ ] **Open PR** — a PR exists and is open. Shows the green pull-request icon, PR title (truncated), PR number in monospace, and an external-link icon that opens the PR on GitHub in a new tab
- [ ] **Merged PR** — the PR has been merged. Shows a muted merge icon, PR title (muted), and PR number
- [ ] **Merged PR with new changes** — merged but with post-merge commits. Shows the merge icon, title, number, and a `2 new` accent badge
- [ ] **Updating** — a rebase or update is in progress. Shows a spinner alongside the PR info
- [ ] Clicking the collapsed row (except the external-link icon) expands the detail section. The external-link icon opens GitHub directly without expanding

### Expanded detail

Clicking the collapsed PR row expands the detail section inline within the sidebar, pushing the file sections down. All detail is visible immediately — no nested collapsibles.

- [ ] **CI status** — a compact row showing pass/fail status with a link to view on GitHub
- [ ] **Auto-fix CI toggle** — when enabled, the fix-ci skill runs automatically when CI fails on the card's PR
- [ ] **Branch name** — displayed in monospace, with a copy-to-clipboard action
- [ ] **Local changes** — lists uncommitted file changes. If present, shows a "Commit" action that auto-generates a commit message and commits
- [ ] **Unpushed commits** — lists commits not yet on the remote. If present, shows a "Push" action
- [ ] **Remote status** — indicates whether the remote has commits not yet pulled. If present, shows a "Pull" action. Pulling uses the same conflict resolution as upstream updates
- [ ] Clicking the row header again collapses back to the compact bar

### Squash-merge-then-fix flow

When a PR has been merged (including squash-merged) and the card has subsequent commits, the system detects these post-merge changes automatically.

- [ ] The sidebar row transitions to the "merged with new changes" state, showing the count of new commits
- [ ] The expanded detail shows a "Prepare new PR" action button (left-aligned)
- [ ] "Prepare new PR" cherry-picks the post-merge commits onto a fresh branch from main, then creates a new PR automatically
- [ ] The row transitions to the new PR's open state once created

## Conflict resolution

When a rebase or pull encounters conflicts, the system uses an AI subagent to resolve them automatically.

- [ ] The server performs the git rebase or merge operation
- [ ] If the operation completes cleanly, the result is committed silently
- [ ] If conflicts are detected, a subagent is spawned to resolve them
- [ ] The subagent receives: the card's journal summary, card description, commit history, and an instruction to explore the current spec and code diffs to understand intent
- [ ] The subagent has allowlisted bash access within the card's worktree: read commands (`git log`, `git show`, `git diff`, `git blame`) and resolution commands (`git checkout`, `git rebase --continue`, `git add`, `git commit`). Worktree isolation prevents cross-card impact
- [ ] The server validates the subagent's result: no conflict markers may remain in any file. If validation passes, the server pushes the resolved commits
- [ ] If the subagent fails to resolve cleanly, the update fails and the user sees an error message. No partial results are committed
- [ ] During resolution, the sidebar PR row shows the updating/spinner state

## Update status persistence

- [ ] The card model stores an `updateStatus` field with values: `idle`, `updating`, or `failed`
- [ ] This field persists across page refreshes — the spinner state survives navigation and reload
- [ ] The `failed` state surfaces an error indicator on the sidebar PR row, with details visible in the expanded section
- [ ] Future use: the persisted status can block conversation turns during updates if needed (not implemented initially — updates and chat run concurrently)

## Real-time updates

- [ ] PR sidebar section, From property badge, and branch details stay current via the same socket/polling system used by the artifacts sidebar
- [ ] Changes to PR status, upstream commit counts, and merge state are reflected without requiring a page refresh

## Cross-references

- `workflow-orchestration.md` — the create-pr skill is triggered by the sidebar's "Create PR" button; the fix-ci skill is available from the expanded PR section when CI fails
- `dependencies.md` — the From property is the user-facing surface for card dependencies; changing the base is equivalent to changing the dependency
- `commit-specs.md` — auto-commit behaviour applies to branch operations; the "under the hood" branch management is surfaced through the From property and branch details
- `card-navigation.md` — the properties bar contains the From property; the artifacts sidebar contains the PR section
- `github.md` — PR creation and status tracking use the GitHub integration's OAuth token and API calls
