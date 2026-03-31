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

## Key ideas

- [ ] Create PRs from specs
- [ ] View code diffs within Workhorse
- [ ] Trigger Review Hero reviews
- [ ] Status sync between Workhorse cards and GitHub PRs
- [ ] Integrate with common-rules for consistent AI agent behaviour
