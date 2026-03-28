---
title: Authentication and access
area: identity
card: WH-021
status: draft
---

Authentication via GitHub SSO. No org hierarchy or admin roles — just individual users whose GitHub repo access determines which teams they can join or create.

## Sign in

- [ ] Users sign in with GitHub SSO (OAuth)
- [ ] On first sign-in, Workhorse creates a user record linked to their GitHub account
- [ ] Display name defaults to their GitHub display name (editable later in settings)
- [ ] Avatar pulled from GitHub
- [ ] Session persists across browser restarts (refresh token flow)
- [ ] Sign-out clears the session

## Access model

- [ ] No organisation or admin concepts — Workhorse is flat, just users and teams
- [ ] A user's accessible projects (products) are derived from the GitHub repos they have **write access** to
- [ ] Workhorse queries the GitHub API for the user's repo permissions on sign-in and periodically refreshes them
- [ ] Users can only see and interact with teams linked to projects they have write access to

## Team membership rules

- [ ] A user can join any team linked to a project they have write access to — no invitation or approval required
- [ ] A user can create a new team within any project they have write access to
- [ ] Users can leave a team at any time
- [ ] A user can be a member of multiple teams (even across different projects)
- [ ] Team management UX (joining, leaving, creating) is described in `navigation/product-navigation.md`

## Projects and GitHub repos

- [ ] Adding a new project still means linking a GitHub repo URL (see WH-010)
- [ ] Any authenticated user with write access to that repo can see and work within the project
- [ ] If a user loses write access to a repo (e.g., removed from the GitHub org), they lose access to that project's teams and cards on next permission refresh
- [ ] Projects with no accessible users are still visible in the system but not to anyone without access

## Unauthenticated experience

- [ ] Unauthenticated visitors see a sign-in page only
- [ ] No public or read-only access — all content requires sign-in
- [ ] Deep links redirect to sign-in and return to the original URL after authentication

## Scope boundaries

- [ ] No role-based permissions (no admin, editor, viewer distinctions)
- [ ] No per-card access control — if you can see the team, you can see and edit everything in it
- [ ] No invitation system — access is entirely derived from GitHub repo permissions
- [ ] No org or workspace concept — the Workhorse instance is one flat space
