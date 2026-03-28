---
title: Product navigation and onboarding
area: navigation
status: draft
---

Sidebar navigation, product onboarding, and discoverability of core views (spec explorer, design browser).

## Sidebar navigation

- [ ] Each product in the sidebar expands to show sub-navigation links: Features, Specs, and Design
- [ ] Clicking a product name navigates to its feature list
- [ ] "Specs" links to `/:productSlug/specs` (the spec explorer)
- [ ] "Design" links to `/:productSlug/design` (the design browser)
- [ ] When multiple products exist, team groups are labelled with their parent product name (e.g. "Tamanu teams") to disambiguate

## Empty product onboarding

- [ ] When a product has zero teams, the product page shows an empty state explaining that a team is needed before features can be created
- [ ] The empty state includes a prominent "Create team" action that either opens an inline form or links to settings with the product pre-selected
- [ ] The "New feature" button is disabled when no teams exist

## Product creation

- [ ] Creating a product in settings opens an inline form with empty fields
- [ ] The GitHub URL field is required and validated (must match `github.com/:owner/:repo` pattern) before the product can be saved
- [ ] Owner and repo name are derived from the URL automatically

## Open questions

> **Sidebar depth:** Should the specs/design sub-links always be visible, or collapse under a disclosure triangle per product?
