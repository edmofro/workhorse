---
title: GitHub integration
area: integrations
card: WH-013
---

Deep GitHub integration — authentication (SSO), create PRs, view diffs, run reviews (via Review Hero), manage branches. Eventually may bring some GitHub workflows into Workhorse directly.

## Authentication

- [ ] GitHub SSO is the sole authentication method (see WH-021)
- [ ] OAuth scopes include repo access for permission checks and branch/PR operations
- [ ] All GitHub API calls (branch creation, commits, PRs, file reads) use the authenticated user's OAuth token — no server-side personal access token (PAT) is required
- [ ] Operations are scoped to the repos the acting user has access to; Workhorse never acts with broader privileges than the user themselves

## Pull requests

- [ ] PR creation is a skill (see `workflow-orchestration.md`) triggered from the PR chip in the properties bar (see `branch-context.md`). The agent decides the PR title and description; the backend executes the GitHub API call using the user's OAuth token
- [ ] The PR chip shows the current PR state (open, merged, behind upstream) and provides access to PR details via a popover (see `branch-context.md`)
- [ ] The jockey detects PR status changes (opened, CI results, review comments) and updates the card's journal

## Code diffs

- [ ] View code diffs within Workhorse as artifacts (see `card-navigation.md`)

## Future integrations

- [ ] Trigger Review Hero reviews via custom skills (see `workflow-orchestration.md`)
- [ ] Status sync between Workhorse cards and GitHub PRs
- [ ] Integrate with common-rules for consistent AI agent behaviour
