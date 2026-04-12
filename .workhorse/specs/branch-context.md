---
title: Branch context and PR management
area: cards
card: WH-078
---

The **PR section** at the top of the artifacts sidebar manages the pull request lifecycle — status, CI, branch diagnostics, upstream base, and actions. It replaces the standalone PR bar.

Mockups: `.workhorse/design/mockups/wh-078/pr-section-expanded.html`, `.workhorse/design/mockups/wh-078/pr-sidebar-interactive.html`

## PR section in artifacts sidebar

A section at the top of the artifacts sidebar (above Specs, Mockups, Code changes) that manages the full pull request lifecycle.

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

- [ ] **CI status** — a compact row showing pass/fail status with a link to view checks on GitHub
- [ ] **Branch name** — displayed in monospace, with a copy-to-clipboard action
- [ ] **Based on** — shows `main` or the parent card identifier (e.g. `WH-058`). When the upstream has newer commits, shows an up-arrow count (e.g. `↑4`) in accent colour and an "Update" action. Clicking "Update" triggers a rebase onto the latest upstream (see Conflict resolution). When up to date, the row displays cleanly with no indicator
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

## Real-time updates

Branch status, CI results, and PR state are pushed to the client via the existing server-sent events (SSE) infrastructure — the same mechanism the sidebar uses for session updates.

- [ ] The server emits card-scoped events (branch status changes, CI updates, PR state transitions) through SSE
- [ ] The client receives events for any card the user has open and updates the PR section and branch details immediately
- [ ] Long-running operations (rebase, conflict resolution) emit start/complete/failed events so the spinner state is driven by the event stream, not persisted in the database
- [ ] If the SSE connection drops and reconnects, the client fetches the current state once to resynchronise

## Cross-references

- `workflow-orchestration.md` — the create-pr skill is triggered by the sidebar's "Create PR" button
- `dependencies.md` — the "Based on" row is the user-facing surface for card dependencies; changing the base is equivalent to changing the dependency
- `commit-specs.md` — auto-commit behaviour applies to branch operations; branch management is surfaced through the PR section's branch details
- `card-navigation.md` — the artifacts sidebar contains the PR section
- `github.md` — PR creation and status tracking use the GitHub integration's OAuth token and API calls
